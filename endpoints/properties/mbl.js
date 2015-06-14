var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore');
var app = require('../../server');


var MBL_CATEGORY_TO_CATEGORY_MAP = {
  "Fjölbýli": "fjolbyli",
  "Einbýli": "einbyli",
  "Hæðir": "haed",
  "Par/Raðhús": "radhus",
  "Hesthús": "hesthus",
  "Jörð": "jord",
  "Sumarhús": "sumarhus",
  "Nýbygging": "nybygging",
  "Atvinnuhús": "atvinnuhus",
  "Annað": "annad"
};

// FIXME: It would be clean to have universal English
//        for the property categories. Until we have a nice vocabulary
//        we have some canonical Icelandic terms.
var PROPERTY_CATEGORIES_MBL_MAP = {
  "fjolbyli": "fjolb", // apartment?
  "einbyli": "einb", // house?
  "haed": "haedir", // story?
  "radhus": "radpar", // bungalow?
  "hesthus": "hesthus", // stable
  "jord": "jord", // land
  "sumarhus": "sumarhus", // summerhouse
  "nybygging": "nybygg", // ???
  "atvinnuhus": "atvinnuhus", // ???
  "annad": "annad" // other
};

var PROPERTY_FEATURES_MBL_MAP = {
  "elevator": "lyfta",
  "garage": "bilskur"
};

var SORT_BY_TYPES_TO_MBL = {
  "date": "date",
  "price_asc": "pricea",
  "price_desc": "priced",
  "size_asc": "sizea",
  "size_desc": "sized",
  "postal_code": "postnr",
  "category": "teg"
};

var BASE_MBL_URL = "http://www.mbl.is/fasteignir";

/*
Supported query parameters:

+ postal_code: comma separated list of postal codes, e.g. postal_code=101,102
+ street_name: an optional street name to filter by
+ floor_size_min: minimum floor size in square meters
+ floor_size_max: maximum floor size in square meters. Note that is only seems to work reliably with multiplies of 10.
+ price_min: minimum price in ISK
+ price_max: maximum price in ISK
+ bedrooms_min: minimum number of bedrooms
+ bedrooms_max: maximum number of bedrooms
+ recent: whether to filter results by age, either 'today' or 'week'
+ filter: additional text to filter by
+ category: filter by property category. Possible values:
 + fjolbyli
 + einbyli
 + haed
 + radhus
 + hesthus
 + jord
 + sumarhus
 + nybygging
 + atvinnuhus
 + annad
+ extra_feature: comma separated list of 'elevator' or 'garage'
+ sort_by: how the results should be ordered. Possible values:
  + date
  + price_asc
  + price_desc
  + size_asc
  + size_desc
  + postal_code
  + type
*/
app.get('/properties/mbl', function (req, res) {
  var query = req.query;
  var q = query.q;
  var page = query.page;
  if (q && page)
  {
    // mbl creates a hash for each query which we forward along with the page
    // for pagination
    getResultsFromURL(res, BASE_MBL_URL + "/leit?q=" + q + "&page=" + page);
    return;
  }

  var postal_codes = query.postal_code;
  var street_name = query.street_name;

  var floor_size_min = query.floor_size_min;
  var floor_size_max = query.floor_size_max;

  var price_min = parseFloat(query.price_min, 10) / 1000000;
  var price_max = parseFloat(query.price_max, 10) / 1000000;

  var bedrooms_min = query.bedrooms_min;
  var bedrooms_max = query.bedrooms_max;

  var recent = query.recent;

  var filter = query.filter;

  var categoryFilter = [];
  if (query.category)
  {
    categoryFilter = _.map(query.category.split(","), function(category)
    {
      return PROPERTY_CATEGORIES_MBL_MAP[category];
    });
  }

  var featuresFilter = [];
  if (query.extra_feature)
  {
    var featuresFilter = _.map(query.extra_feature.split(","), function(feature)
    {
      return PROPERTY_FEATURES_MBL_MAP[feature];
    });
  }

  var tegundFilter = categoryFilter.concat(featuresFilter);

  var sort_by = query.sort_by || "date";

  var url = BASE_MBL_URL + "/query";
  var parameters = {
    "searchpnr": postal_codes,
    "streetsearch": street_name || null,
    "sqm-from": floor_size_min,
    "sqm-to": floor_size_max,
    "nbd-from": bedrooms_min,
    "nbd-to": bedrooms_max,
    "pri-from": price_min || null,
    "pri-to": price_max || null,
    "textsearch": filter || null,
    "tegund":  tegundFilter || null,
    "sortby": SORT_BY_TYPES_TO_MBL[sort_by] || null
  };

  if (recent === "today")
  {
    parameters.newtoday = true;
  }
  else if (recent == "week")
  {
    parameters.newweek = true;
  }

  var options = {
    form: parameters,
    qsStringifyOptions: {arrayFormat: 'brackets'}
  };

  request.post(url, options, function(error, response, body) {
    if (error) {
      return res.json(500, {error: url + ' not responding correctly...' });
    }

    // The inital form POST to mbl returns a redirect response to the actual
    // response
    var resultURL = response.headers['location'];
    getResultsFromURL(res, resultURL);
  });
});

function getResultsFromURL(res, url)
{
  request.get(url, function(error, response, body) {
    var $;
    try {
      $ = cheerio.load(body);
    } catch (e) {
      return res.json(500, {error:'Could not parse the response body.'});
    }

    var results = $(".single-realestate").map(function(index, property) {
      var $property = $(property);
      var $head = $(".realestate-head", $property);
      var $properties = $("strong", ".realestate-properties", $property);

      var priceAsString = $properties.eq(0).text().trim().replace(" kr.", "").replace(/\./g, "");
      var price = priceAsString === "Tilboð" ? null : parseInt(priceAsString, 10);

      var sizeAsString = $properties.eq(1).text().replace(" m2", "");
      var size = parseFloat(sizeAsString, 10);
      var categoryMBL = $properties.eq(2).text();
      var category = MBL_CATEGORY_TO_CATEGORY_MAP[categoryMBL];
      var bedrooms = parseInt($properties.eq(3).text(), 10);

      var propertyId = $property.attr("id").replace("realestate-result-", "");

      var street_name = $("h4", $head).text().replace(",", "").replace(/Opið Hús/g, "").trim();
      var postalCode_city = $("h5", $head).text().split(" ");

      var $profile = $(".profile", $property);
      var $openHouse = $(".open_house", $profile).remove("strong");

      var openHouseString = $openHouse.text().replace("Opið hús", "").replace(/\s+/g, " ").trim();

      var propertyData = {
        id: propertyId,
        source_link: BASE_MBL_URL + "/fasteign/" + propertyId,
        street_name: street_name,
        postal_code: postalCode_city[0],
        city: postalCode_city[1],
        price: price,
        floor_size: size,
        category: category,
        bedrooms: bedrooms,
        photos: ["http://www.mbl.is" + $("img", $profile).attr("src")],
      };

      if (openHouseString)
      {
        propertyData.open_house = openHouseString;
      }

      return propertyData;
    });

    var responseData = {results: results};

    var nextUrl = $("a", ".next").attr("href");
    if (nextUrl)
    {
      var url__query = nextUrl.split("?");
      responseData["paging"] = {
        next: "/properties/mbl?" + url__query[1]
      };
    }

    return res.cache(1800).json(responseData);
  });
}
