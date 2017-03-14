'use strict'

var querystring = require('querystring')

var AWS = require('aws-sdk')
var uuid = require('uuid')
var validator = require('validator')

var config = require('../config.json')
var encryption = require('../lib/encryption')
var render = require('./render')

module.exports = (event, context, callback) => {
  var docClient = new AWS.DynamoDB.DocumentClient()
  var form = querystring.parse(event.body)
  var payload = {}

  if (form['_honeypot'] !== undefined && !validator.isEmpty(form['_honeypot'])) {
    callback(null, render.response(422, config.MSG_HONEYPOT || 'You shall not pass'))
  } 

  if (form['_send-to'] === undefined || !validator.isEmail(form['_send-to'])) {
    callback(null, render.response(422, config.MSG_MISSING_SEND_TO || 'Form not sent, the admin has not set up a send-to address.'))
  }

  payload.id = uuid.v4()
  var data = {}
  for (var key in form) {
    data[key] = validator.trim(form[key])
  }
  payload.data = encryption.encrypt(JSON.stringify(data))

  docClient.put({TableName: config.TABLE_NAME, Item: payload}, (error) => {
    if (error) {
      callback(null, render.response(422, config.MSG_DB_ERROR || 'Form not sent, there was an error adding it to the database.'))
    }

    if (form['_redirect-to'] !== undefined && validator.isURL(form['_redirect-to'])) {
      callback(null, render.response(301, config.MSG_SUCCESS || 'Form submission successfully made.', form['_redirect-to']))
    }

    callback(null, render.response(200, config.MSG_SUCCESS || 'Form submission successfully made.'))
  })
}