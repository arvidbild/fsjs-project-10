'use strict';

/**
 * /loans            - GET  |
 * /loans/overdue    - GET  |
 * /loans/checked    - GET  |
 * /loans/new        - GET  |
 * /loans/new        - POST |
 * /loans/return/:id - GET  |
 * /loans/return/:id - POST | 
 * 
 * renderNewLoan(res, loan, err)
 * renderReturnLoan(req, res, err)
 */

var express = require('express');
var router  = express.Router();
var moment  = require('moment');

// Database Models
var Book    = require('../models').Book;
var Patron  = require('../models').Patron;
var Loan    = require('../models').Loan;



/**
 * GET all loans
 * /loans
 * 
 * Read all loans details in the loans table
 * and associated book and patron details
 */
router.get('/', function(req, res, next) {
  
  let loanQuery = {
    include: [Book, Patron]
  }

  Loan.findAll(loanQuery)
      .then(function (loans) {
        res.render('loans', {loans: loans, pageTitle: 'Loans'});
      });
});



/**
 * GET overdue loans
 * /loans/overdue
 * 
 * Read all overdue loan details in the loans table
 * and associated book and patron details
 */
router.get('/overdue', function(req, res, next) {

  let loanQuery = {
    include: [Book, Patron],
    where: {
      return_by: { $lt: new Date() },
      returned_on: null
    }
  }

  Loan.findAll(loanQuery)
      .then(function (loans) {
        res.render('loans', {loans: loans, pageTitle: 'Overdue loans'});
      });
});



/**
 * GET checked out loans
 * /loans/checked
 * 
 * Read all checked loan details in the loans table
 * and associated book and patron details
 */
router.get('/checked', (req, res, next) => {

  let loanQuery = {
    include: [Book, Patron],
    where: {
      returned_on: null 
    }
  }

  Loan.findAll(loanQuery)
      .then((loans) => {
        res.render('loans', {loans: loans, pageTitle: 'Checked out loans'});
      });
});


/**
 * GET Add new loan
 * /loans/new
 * 
 * Loads the add new loan form with 'loaned on' and
 * 'return by' dates preselected
 */
router.get('/new', (req, res, next) => {

  let loan = Loan.build({
    loaned_on: moment().format('YYYY-MM-DD'),
    return_by: moment().add(7, 'days').format('YYYY-MM-DD')
  });

  renderNewLoan(res, loan);

});



/**
 * POST Save new loan
 * /loans/new
 * 
 * Saves the new loan to database while handles
 * any validation errors
 */
router.post('/new', (req, res, next) => {

  Loan.create(req.body) // create a new loan and redirect
      .then((loan) => { // to loans index page
        res.redirect('/loans');
      })
      .catch((err) => { // or show error messages
        if (err.name === 'SequelizeValidationError') {
          let loan = Loan.build(req.body);
          renderNewLoan(res, loan, err);
        }
        else res.send(500);
      });
});



/**
 * GET loan details
 * /loans/return/:id
 * 
 * Retreives loan details for specified ID and
 * displays the return form with the 'returned on'
 * field pre selected
 */
router.get('/return/:id', (req, res, next) => {
  renderReturnLoan(req, res);
});



/**
 * POST loan details
 * /loans/return/:id
 * 
 * Updates the record with the provide date and
 * handles any validation errors
 */
router.post('/return/:id', (req, res, next) => {
  
  Loan.findById(req.params.id)
      .then((loan) => { // update loan record
        return loan.update(req.body);
      })
      .then((loan) => { // redirect to loan listing page
        res.redirect('/loans');
      })
      .catch((err) => { // handle any errors
        if (err.name === 'SequelizeValidationError') {
            renderReturnLoan(req, res, err);
        }
        else res.sendStatus(500);
      });
});



/**
 * Helper for rendering the new loan form
 */
function renderNewLoan(res, loan, err) {
    
  Book.findAll() // get all the books
      .then((books) => { 
        Patron.findAll() // get all the patrons
              .then((patrons) => { 
                res.render('loan_new', { // render the new loan form
                    loan: loan,
                    books: books,
                    patrons: patrons,
                    errors: err ? err.errors : [],
                    pageTitle: 'New Loan'
                  }
                );
              });
      });
}



/**
 * Helper for rendering the loan return form
 */
function renderReturnLoan(req, res, err) {
  
  let loanQuery = {
    include: [Book, Patron],
    where: {
      id: req.params.id // only one loan by id
    }
  }

  Loan.findOne(loanQuery) // get all loans
      .then((loan) => {
        loan.returned_on = req.body && req.body.returned_on
                         ? req.body.returned_on
                         : moment().format('YYYY-MM-DD');
        res.render('loan_return', { // render the return loan form
            loan: loan,
            errors: err ? err.errors : [],
            pageTitle: 'Return Book'
          }
        );
      });
}



module.exports = router;
