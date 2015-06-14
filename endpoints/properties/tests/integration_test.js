var request = require('request');
var assert = require('assert');
var helpers = require('../../../lib/test_helpers.js');

describe('/properties/mbl', function() {
    it("should return paging if many pages", function(done) {
        var params = helpers.testRequestParams("/properties/mbl", {});
        var resultHandler = helpers.testRequestHandlerForFields(done, [], function(json)
        {
            assert(json.paging);
            assert(json.paging.next);
        });
        request(params, resultHandler);
    });

    it("should return properties with expected fields", function(done) {
        var expectedFields = [
            "id",
            "source_link",
            "street_name",
            "postal_code",
            "city",
            "price",
            "floor_size",
            "category",
            "bedrooms",
            "photos"
        ];

        var params = helpers.testRequestParams("/properties/mbl", {});
        var resultHandler = helpers.testRequestHandlerForFields(done, expectedFields);
        request(params, resultHandler);
    });

    it("should be able to filter by postal code", function(done) {
        var params = helpers.testRequestParams("/properties/mbl", {postal_code: "101,103"});
        var resultHandler = helpers.testRequestHandlerForFields(done, [], function(json)
        {
            json.results.forEach(function(result, i) {
                var postalCode = result.postal_code;
                assert(postalCode === '101' || postalCode === '103');
            });
        });
        request(params, resultHandler);
    });

    it("should be able to filter by floor size", function(done) {
        var floorSizeMin = 50;
        var floorSizeMax = 60;
        var params = helpers.testRequestParams("/properties/mbl", {floor_size_min: floorSizeMin, floor_size_max: floorSizeMax});
        var resultHandler = helpers.testRequestHandlerForFields(done, [], function(json)
        {
            json.results.forEach(function(result, i) {
                var floorSize = result.floor_size;
                assert(floorSizeMin <= floorSize && floorSize <= floorSizeMax);
            });
        });
        request(params, resultHandler);
    });

    it("should be able to filter by price", function(done) {
        var priceMin = 20000000;
        var priceMax = 30000000;
        var params = helpers.testRequestParams("/properties/mbl", {price_min: priceMin, price_max: priceMax});
        var resultHandler = helpers.testRequestHandlerForFields(done, [], function(json)
        {
            json.results.forEach(function(result, i) {
                var price = result.price;
                assert(priceMin <= price && price <= priceMax);
            });
        });
        request(params, resultHandler);
    });

    it("should be able to filter by bedrooms", function(done) {
        var bedroomsMin = 2;
        var bedroomsMax = 3;
        var params = helpers.testRequestParams("/properties/mbl", {bedrooms_min: bedroomsMin, bedrooms_max: bedroomsMax});
        var resultHandler = helpers.testRequestHandlerForFields(done, [], function(json)
        {
            json.results.forEach(function(result, i) {
                var bedrooms = result.bedrooms;
                assert(bedroomsMin <= bedrooms && bedrooms <= bedroomsMax);
            });
        });
        request(params, resultHandler);
    });

    it("should be able to filter by category", function(done) {
        var params = helpers.testRequestParams("/properties/mbl", {category: "fjolbyli,radhus"});
        var resultHandler = helpers.testRequestHandlerForFields(done, [], function(json)
        {
            json.results.forEach(function(result, i) {
                var category = result.category;
                assert(category === "fjolbyli" || category === "radhus");
            });
        });
        request(params, resultHandler);
    });

    it("should be able to filter by extra feature", function(done) {
        var params = helpers.testRequestParams("/properties/mbl", {category: "atvinnuhus", extra_feature: "elevator"});
        var resultHandler = helpers.testRequestHandlerForFields(done, [], function(json)
        {
            json.results.forEach(function(result, i) {
                var category = result.category;
                assert(category === "atvinnuhus");
            });
        });
        request(params, resultHandler);
    });
});
