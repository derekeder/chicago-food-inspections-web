var auth = { 
      consumerKey: "3gS70cAe5mSQ_dtJQgmC-w", 
      consumerSecret: "_YeZlmhO0m7rLV3kDkP3uE4EQKM",
      accessToken: "NitGLZuV3unxJEjosnSJ1NgHNAfES9-g",
      accessTokenSecret: "ilRl0aAMwV3k198lirYNm4gs7gI",
      serviceProvider: { 
        signatureMethod: "HMAC-SHA1"
      }
  };

var YelpApi = {

  Search: function(terms, near, license) {
    
    var accessor = {
        consumerSecret: auth.consumerSecret,
        tokenSecret: auth.accessTokenSecret
    }
    
    var parameters = [];
    parameters.push(['term', terms]);
    parameters.push(['location', near]);
    //parameters.push(['callback', 'cb']);
    parameters.push(['oauth_consumer_key', auth.consumerKey]);
    parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
    parameters.push(['oauth_token', auth.accessToken]);
    parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
    
    var message = { 
      'action': 'http://api.yelp.com/v2/search',
      'method': 'GET',
      'parameters': parameters 
    };
    
    OAuth.setTimestampAndNonce(message);
    OAuth.SignatureMethod.sign(message, accessor);
    
    var parameterMap = OAuth.getParameterMap(message.parameters);
    parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature)
    //console.log(parameterMap);
    
    $.ajax({
      'url': message.action,
      'data': parameterMap,
      'cache': true,
      'dataType': 'jsonp',
      //'jsonpCallback': 'cb',
      'success': function(data, textStats, XMLHttpRequest) {
        //console.log(data);
        var bizId = data['businesses'][0]['url'];
        bizId = bizId.substring(bizId.lastIndexOf('/')+1);
        console.log(bizId);
        var biz = new YelpApi.GetBusiness(bizId, license);
      }
    });
  },
  
  GetBusiness: function(buisnessId, license) {
  
    var accessor = {
        consumerSecret: auth.consumerSecret,
        tokenSecret: auth.accessTokenSecret
    };
    
    var parameters = [];
    //parameters.push(['callback', 'cb']);
    parameters.push(['oauth_consumer_key', auth.consumerKey]);
    parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
    parameters.push(['oauth_token', auth.accessToken]);
    parameters.push(['oauth_signature_method', 'HMAC-SHA1']);

    var message = { 
    'action': 'http://api.yelp.com/v2/business/' + buisnessId,
    'method': 'GET',
    'parameters': parameters 
    };
    
    OAuth.setTimestampAndNonce(message);
    OAuth.SignatureMethod.sign(message, accessor);
    
    var parameterMap = OAuth.getParameterMap(message.parameters);
    parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature)
    //console.log(parameterMap);
    
    $.ajax({
      'url': message.action,
      'data': parameterMap,
      'cache': true,
      'dataType': 'jsonp',
      //'jsonpCallback': 'cb',
      'success': function(data, textStats, XMLHttpRequest) {
        var isClosed = data['is_closed'];
        if (isClosed) isClosed = "Closed";
        else isClosed = "Open";
        
        $("#closed-" + license).html(isClosed);
        //console.log(isClosed + ": " + license);
        //console.log(data);
      }
    });
  }
}