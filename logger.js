export function logTable(req, res, next) {
  let logtable = {
    "Method" : req.method,
    "IP" : req.ip,
    "Path" : req.path,
  }
  
  if (req.headers.authorization) {
    logtable.Auth = true;
  } else {
    logtable.Auth = false;
  }

  console.table([logtable]);
  next();
}