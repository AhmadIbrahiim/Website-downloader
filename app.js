var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Surface AUTH_TOKEN to BOTH the route context AND the layout, because
// express-hbs renders the layout in a separate context from the inner view
// and {{authToken}} inside the layout won't see res.locals. Bind it to
// app.locals so every render path has access without re-passing it.
app.locals.authToken = process.env.AUTH_TOKEN || '';

app.use(logger('dev'));
app.use(express.json({ limit: '64kb' }));           // tiny payloads only
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(cookieParser());

// Minimal security headers. Real deployments should swap this for `helmet`.
app.use(function (req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
    "connect-src 'self' ws: wss:;");
  next();
});

// Only serve generated archives and assets under /sites, NOT the rest of /public
// directly. The /public mount is intentionally removed; the static site UI
// assets are still served via the explicit /static route below.
app.use('/static', express.static(path.join(__dirname, 'public'), {
  dotfiles: 'deny',
  index: false,
  redirect: false,
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;