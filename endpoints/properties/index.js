var app = require('../../server');

app.get('/properties', function (req, res) {
  return res.json(
    {
      results: [
        {
          info: 'This is an api for searching Icelandic properties',
          endpoints: {
            mbl: '/properties/mbl'
          }
        }
      ]
    }
  );
});
