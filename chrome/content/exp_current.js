/*

    WebExperiment
        .id
        .bucket
        .description
        .bucket_text

    ExpBucketSetter
        set_bucket
        construct_url
        hit_url

    ExpWebReader
        pos                   <<-- store state of what pos is being shown
        last_url              <<-- store the previous url, to know if there was a change.
        load_prefs
        load_web
        got_results_back
        get_experiment        <<-- called to get an update of bucket information
        get_experiment_domain
        set_domain            <<-- called when a new tab is selected
        extract_experiment
        build_url_use_internal_domain
        build_url
        web_hit
        hit_web_more_direct
        hit_web



*/

// set to 1, paste in java script tester
// ( firefox, tools, extension developer, javascript environment )
var g_testing = 0;
var g_tracing = 0;

var g_show_err_once = 1;

var httpRequest = 0;

// there are many experiments
// give each one their own object


function global_method()
{
    dump('exp_current.js : global method called\n');
}


// when a reply comes back from
//    url_template: "http://{domain}/pub/agent.dll/qscr=fctl/abme={experiment_id}/abmv={bucket}",
// pull the values and store in this guy:
//
function WebExperiment(id)
{
    this.id = id;
    this.pos_ids = new Array();

    this.bucket;        // comes from web
    this.description;   // comes from preferences
    // todo: store array, return active?
    this.bucket_text;   // comes from preferences

    this.guid;          // comes from web
    this.ipaddr;        // comes from web
    this.eapid;         // comes from web
    this.hash;          // comes from web

    this.get_experiment_id = function( pos )
    {
        pos = pos.toUpperCase();
        if( null != pos_ids[pos] && "undefined" != typeof( pos_ids[pos] ) )
            return pos_ids[pos];

        return -1;
    }

    this.dump = function(debugging, message)
    {
        var result = '';
        var print_out = 0;

        if( ( "undefined" != typeof( debugging ) ) &&
            ( debugging == "1" || debugging == 1 ) )
        {
            print_out = 1;
        }


        if( "undefined" != typeof( message ) )
        {
            if( print_out )
            {
                print ( message );
            }
            result += message + "\n";
        }

        if( print_out )
        {
            // todo: how to embed carriage returns in print?
            print( '  dump of web experiment' );
            print( '  id: ' + this.id );
            print( '  bucket: ' + this.bucket );
            print( '  description: ' + this.description );
            print( '  bucket_text: ' + this.bucket_text );
            print( '  guild: ' + this.guid );
            print( '  ipaddr: ' + this.ipaddr );
            print( '  eapid: ' + this.eapid );
            print( '  hash: ' + this.hash );
        }

        // todo: how to embed carriage returns in print?
        dump( '  dump of web experiment\n' );
        dump( '  id: ' + this.id + '\n');
        dump( '  bucket: ' + this.bucket + '\n');
        dump( '  description: ' + this.description + '\n');
        dump( '  bucket_text: ' + this.bucket_text + '\n');
        dump( '  guild: ' + this.guid + '\n');
        dump( '  ipaddr: ' + this.ipaddr + '\n');
        dump( '  eapid: ' + this.eapid + '\n');
        dump( '  hash: ' + this.hash + '\n');

        result += '  dump of web experiment';
        result += '  \nid: ' + this.id;
        result += '  \nbucket: ' + this.bucket;
        result += '  \ndescription: ' + this.description;
        result += '  \nbucket_text: ' + this.bucket_text;
        result += '  \nguild: ' + this.guid;
        result += '  \nipaddr: ' + this.ipaddr;
        result += '  \neapid: ' + this.eapid;
        result += '  \nhash: ' + this.hash;

        return result;
    }
}

var ExpBucketSetter =
{
    // http://www.expedia.com.estr34.bgb.karmalab.net/pub/agent.dll/qscr=fctl/abme=1078/abmv=1
    url_template: "http://{domain}/pub/agent.dll/qscr=fctl/abme={experiment_id}/abmv={bucket}",
    url_e3_template: "http://{domain}/devtools/setexperiment?abme={experiment_id}&abmv={bucket}",

    // note that for the e3 template we must use ? and &, the repeated / use fails.

    set_bucket: function(experiment_id, new_bucket, url)
    {
        try
        {
//             alert(' set bucket: ' + experiment_id +
//                   '\n new bucket:' + new_bucket );

            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch("InstaBucket.");

            // default pref: bucketChange.useCookies to true
            var bucket_via_cookie = false;
            var save_name = 'bucketChange.useCookies';
            if( prefs.prefHasUserValue( save_name ) )
            {
                loaded_value = prefs.getCharPref( save_name );
                bucket_via_cookie = ( loaded_value == 'yes' );
            }

            if( bucket_via_cookie )
            {
                this.set_bucket_via_cookie( experiment_id, new_bucket, url );
            }
            else
            {
                this.set_bucket_via_url( experiment_id, new_bucket );
            }

            this.auto_reload_if_configed();
        }
        catch(e)
        {
            alert(' set bucket:\n' + e);
        }
    },

    set_bucket_via_cookie: function(experiment_id, new_bucket, url)
    {
        try
        {
            if( 'undefined' == typeof( url ) || null == url || url.length < 1 )
            {
                url = ExpWebReader.url_domain;
                if( ExpWebReader.url_environment.length > 0)
                {
                    url += '.' + ExpWebReader.url_environment;
                }

                dump('set bucket via cookie received empty url, set to:\n' + url + '\n' );
            }
            else
            {
                dump('set bucket via cookie received url of:\n' + url + '\n' );
            }

            if( url.indexOf('http') < 0 )
            {
                url = 'http://' + url;
            }

            // working with:  set bucket via cookie url: http://www.expedia.co.uk
            if( g_tracing ) print( 'set bucket via cookie url: ' + url );
//             else alert( 'set bucket via cookie url: ' + url );

            this.force_exp_bucket_via_cookie( url, experiment_id, new_bucket );
        }
        catch(e)
        {
            alert('set bucket via cookie:\n' + e);
        }
    },

    force_exp_bucket_via_cookie: function( url, exp_id, bucket )
    {
        try
        {
            var set_these_cookies = new Array();

            var cookies = this.get_cookies( url );

            var p1_cookie = cookies.p1;
            var linfo = cookies.linfo;

    // p1 = `gacct=v.1,13,215845731`tpid=v.1,4`linfo=v.4,|0|0|255|1|0||||||||4105|0|0||0|0|1080|-1|1`88
    // linfo=v.4,|0|0|255|1|0||||||||4105|0|0||0|0|1080|-1|1

            if( "undefined" != typeof( p1_cookie ) )
            {
                dump('cookie p1 pre tweak:\n' + p1_cookie + '\n');

                var new_p1 = this.prep_cookie( p1_cookie, exp_id, bucket );
                if( new_p1.length > 0 )
                    set_these_cookies.p1 = new_p1;

                dump('cookies p1 after tweak:\n' + new_p1 + '\n');
            }

            if( "undefined" != typeof( linfo ) )
            {
                dump('cookie linfo pre tweak:\n' + linfo + '\n');

                var new_linfo = this.prep_cookie( linfo, exp_id, bucket );
                if( new_linfo.length > 0 )
                    set_these_cookies.linfo = new_linfo;

                dump('cookie linfo after tweak:\n' + new_linfo + '\n');
            }
            this.set_cookies( url, set_these_cookies );
        }
        catch(e)
        {
            alert(' force bucket via cookie:\n' + e);
        }
    },

    prep_cookie: function( cookie_txt, exp_id, bucket )
    {
        var result = '';

        try
        {
            if( g_testing ) print( 'pre cookie scanning: \n' + cookie_txt );
//             else alert( 'pre cookie scanning: \n' + cookie_txt );

// after clearing cookies, and loading page:
// `tpid=v.1,1`linfo=
// v.4,|0|0|255|1|0||||||||1033|0|0||0|0|0|-1|-1`63
//
// .com has this preceding linfo, in the p1 cookie
// `gacct=v.1,1,215902948`tpid=v.1,1`linfo=
//                                       vvvvvvvvv length
// v.4,|0|0|255|1|0||||||||1033|0|0||0|0|1078|-1|0`87
//
// non .com are more simple:
//                                       vvvvvvvvv
// v.4,|0|0|255|1|0||||||||2057|0|0||0|0|1067|-1|1

            var regex = /^(.*?\|)[^|]*\|[^|]*\|[^|]*?((`\d+)(.*))?$/

            var match = regex.exec( cookie_txt );

            if( match != null && match.length > 1 )
            {
                // insert  experiment_id|-1|bucket

                // match 0 == everything matched via regex
                // match 1 == first grouping in prens ( zzzz )
                // match 2 == second grouping, if there is a length given
                // match 3 == anything that might have come after the length

                // todo: what does the -1 mean, does it change?
                result = match[1] + exp_id + '|-1|' + bucket;
//                 alert( 'pre length result:\n' + result );

                if( match.length > 2 && "undefined" != typeof( match[2] ) )
                {
                    var len = result.length;

                    result += '`' + len;

//                     result += match[2];
                }
                if( match.length > 4 && "undefined" != typeof( match[4] ) )
                {
                    // have never seen this come up, but just in case.
                    result += match[4];
                }
//                 alert( 'post length result:\n' + result );
            }
            else
            {
                result = 'no match';
            }
        }
        catch(e)
        {
            alert('prep cookie:\n' + e);
        }

        return result;
    },

    get_cookies: function( url )
    {
        try
        {
            if( url.indexOf( 'http' ) < 0 )
            {
                url = 'http://' + url;
            }

            dump('get cookies for url: ' + url + '\n');

            var key_value_pairs = new Array();

            var ios = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
            var uri = ios.newURI(url, null, null);
        //     var uri = ios.newURI("http://www.google.com/", null, null);
            var cookieSvc = Components.classes["@mozilla.org/cookieService;1"]
                .getService(Components.interfaces.nsICookieService);
            var cookies = cookieSvc.getCookieString(uri, null);

            var raw_pairs = cookies.split(';');

            var count = raw_pairs.length;
            for( var i = 0 ; i < count ; i ++)
            {
                var pair = raw_pairs[i];
                // cannot split on '=' due to there being = in the value.
                var regex = /^\s*?(\S+?)\s*?=(.*)/;
                var match = regex.exec( pair );
                if( match == null )
                {
                    alert('failed to pull from ' + pair );
                    break;
                }
                var key = match[1];
                var value = match[2];

                key_value_pairs[key] = value;
            }

        }
        catch(e)
        {
            dump('**exception** get cookies:\n' + e + '\n');
        }
        return key_value_pairs;
    },

    set_cookies: function( url, cookies )
    {
        try
        {
            // working with: set cookie url in: http://www.expedia.co.uk
            if( g_tracing ) print( 'set cookie url in: ' + url );
//             else alert( 'set cookie url in: ' + url );

            var isppe = ( url.indexOf( 'wwwexpedia' ) > -1 );
            var domain = url;
            var path = '/';
            var blocked = false;

            if( isppe )
            {
                // the ppe cookie is set on .wwwexpediacom.expediaweb.com
                // by removing the http:// and replacing it with a period .
                domain = domain.replace('http://wwwexpedia', '.wwwexpedia');
                domain = domain.replace('http://www.', '.');
            }
            else
            {
                // the non ppe cookie is set on .expedia.com
                // by removing the http://www and keeping the first period .
                domain = domain.replace('http://www.', '.');
                domain = domain.replace('www.', '.');
            }


            // working with: set cookie url ft: .expedia.co.uk
            if( g_tracing ) print( 'set cookie url ft: ' + domain );
//             else alert( 'set cookie url ft: ' + domain );

            dump('set cookie in url: ' + url + '\n');

            var cookieUri = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService)
                .newURI(url, null, null);
            var expire_date = 'Mon, 04 Jul 2016 06:38:28 GMT';

//             try
//             {
//                 if( !g_testing) document.getElementById('cookienew0' ).value = '';
//                 if( !g_testing) document.getElementById('cookienew1' ).value = '';
//                 if( !g_testing) document.getElementById('cookienew2' ).value = '';
//                 if( !g_testing) document.getElementById('cookienew3' ).value = '';
//             }
//             catch(e)
//             {
//                 alert('failed to clear cookie edit boxes:\n' + e);
//             }

            var index = 0;
            for( var cookie_key in cookies )
            {
                dump('removing cookie:' + '\n  host: ' + domain + '\n  name: ' + cookie_key +
                        '\n  path: ' + path + '\n  blocked: ' + blocked + '\n');
                // when hitting a url via IP address, setting the cookie was failing,
                // the web developer firefox extension deletes the cookie before adding it back.
                // todo wd: shows other web developer items to try.
                Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager).
                    remove(domain, cookie_key, path, blocked);

                // var cookieString = "your_key_name=your_key_value;domain=.example.com;expires=Thu, 15 Jan 2009 15:24:55 GMT";
                var cookieString = cookie_key + "=" + cookies[cookie_key];
                if( domain.charAt(0) == "." )
                {
                    cookieString += ";domain=" + domain;
                }
                cookieString += ";expires=" + expire_date;

//                 try
//                 {
//                     if( !g_testing) document.getElementById('cookienew' + index ).value = cookieString;
//                 }
//                 catch(e)
//                 {
//                     alert('falied to set cookie edit:\n' + e);
//                 }

                if( g_tracing ) print( 'new cookie string: ' );
                if( g_tracing ) print(cookieString);

//                 alert('set cookie:\n' + cookieUri +
//                     '\n' + cookieString );

                dump('set cookie: ' + cookieString + '\n');

                Components.classes["@mozilla.org/cookieService;1"]
                    .getService(Components.interfaces.nsICookieService)
                    .setCookieString(cookieUri, null, cookieString, null);
            }
        }
        catch(e)
        {
            alert('set cookies:\n' + e);
        }
    },


    set_bucket_via_url: function(experiment_id, new_bucket)
    {
        try
        {
//             alert("id: " + experiment_id + " bucket: " + new_bucket );
            var url = this.construct_url(experiment_id, new_bucket);
//             alert("url: " + url);

            // todo: make this async.

            this.hit_url( url );
        }
        catch(e)
        {
            alert("set bucket:\n" + e);
        }
    },

    auto_reload_if_configed: function()
    {
        try
        {
            var tBrowser = top.document.getElementById("content");

            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch("InstaBucket.");

            var auto_reload = true;
            var loaded_value = '';
            var save_name = 'bucketChange.reloadPage';
            if( prefs.prefHasUserValue( save_name ) )
            {
                loaded_value = prefs.getCharPref( save_name );
                auto_reload = ( loaded_value == 'yes' );
            }

    //             alert(' exp current loaded: ' + loaded_value + ' auto reload set to: ' + auto_reload);

            if( auto_reload )
                tBrowser.reload();
        }
        catch(e)
        {
            alert('auto reload if configed:\n' + e);
        }
    },

    construct_e3_url: function(experiment_id, new_bucket)
    {
        var domain_set = ExpWebReader.url_domain;
        if( ExpWebReader.url_environment.length > 0)
        {
            domain_set += '.' + ExpWebReader.url_environment;
        }

        var set_bucket_url = this.url_e3_template;
        set_bucket_url = set_bucket_url.replace( '{domain}', domain_set );
        set_bucket_url = set_bucket_url.replace( '{experiment_id}', experiment_id );
        set_bucket_url = set_bucket_url.replace( '{bucket}', new_bucket );

        return set_bucket_url;
    },

    construct_url: function(experiment_id, new_bucket)
    {

        var domain_set = ExpWebReader.url_domain;
        if( ExpWebReader.url_environment.length > 0)
        {
            domain_set += '.' + ExpWebReader.url_environment;
        }

        var set_bucket_url = this.url_template;
        set_bucket_url = set_bucket_url.replace( '{domain}', domain_set );
        set_bucket_url = set_bucket_url.replace( '{experiment_id}', experiment_id );
        set_bucket_url = set_bucket_url.replace( '{bucket}', new_bucket );

        return set_bucket_url;
    },

    get_http_obj: function()
    {
        var httpReqeust = null;

        try
        {
            if (window.XMLHttpRequest)
            {
                // Mozilla, Safari, ...
                httpRequest = new XMLHttpRequest();
            }
            else if (window.ActiveXObject)
            {
                // IE
                httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
            }
        }
        catch(e)
        {
            alert('get http obj:\n' + e);
        }
        return httpRequest;
    },

    hit_url: function( url )
    {
        try
        {
//             alert('url to change bucket:\n' + url);
//             if (window.XMLHttpRequest)
//             {
//                 // Mozilla, Safari, ...
//                 httpRequest = new XMLHttpRequest();
//             }
//             else if (window.ActiveXObject)
//             {
//                 // IE
//                 httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
//             }

//             this.get_http_obj();
            httpRequest = ExpBucketSetter.get_http_obj();

//             httpRequest.onreadystatechange = this.web_hit;

            var async = false;
            httpRequest.open('GET', url, async);

            try
            {
                httpRequest.send(null);
            }
            catch(e)
            {
                alert('hit url send:\n' + e);
            }
        }
        catch(e)
        {
            alert('hit url:\n' + url + '\nexception:\n' + e);
        }

    }
}

// this is only one web reader for experiments
// https://{domain}/Pubspec/Scripts/setaborerrcode.asp?abme={exp_id}&d=1
// https://www.expedia.com/Pubspec/Scripts/setaborerrcode.asp?abme=1008&d=1

// newer approach:
// https://{domain}/Pubspec/Scripts/setaborerrcode.asp?CCheck=1&abme={exp_id}&d=1

// https://developer.mozilla.org/en/AJAX/Getting_Started
var ExpWebReader =
{
    url_domain: 'www.expedia.com',
    url_environment: '',

    pos: 'US',

    // todo: do we use  var  here?
    url_template: "https://{domain}/Pubspec/Scripts/setaborerrcode.asp?CCheck=1&abme={exp_id}&d=1",

    httpRequest:0,
    // call back function so testing can hook in
    call_this_guy:0,

    experiment_read: 0,

    got_results_back: function( httpRequest )
    {
        if( g_tracing ) print(" exp web reader got results back: " );

        if( httpRequest.readyState < 4 )
            return;

        if( httpRequest.status === 200 ){
            }// good to go
        else{
            return;}

        if( g_tracing ) print(" exp web reader ready to process" );

        try
        {
            // thread safe?  nope.
            ExpWebReader.experiment_read = ExpWebReader.extract_experiment(
                httpRequest.responseText );

            if( g_tracing )
            {
                print("experiment built");
                ExpWebReader.experiment_read.dump(1);
            }
        }
        catch(e)
        {
            alert("exception building experiment:\n" + e);
        }
    },

    get_experiment_async: function( experiment_id, callback )
    {
        try
        {
            var url = this.build_url_use_internal_domain( experiment_id );

            ExpWebReader.hit_web_async( url, callback );
        }
        catch(e)
        {
            alert('get experiment async:\n' + e);
        }
    },

    get_attempt_result: function()
    {
        try
        {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch("InstaBucket.");

            var pos = this.url_domain;
            var env = this.url_environment;
            var savename = 'security.attempt';
            savename += '.' + pos;
            savename += '.' + env;

            // let them fail once.
            if( !prefs.prefHasUserValue( savename ) )
            {
                return false;
            }

            if( 'OK' != prefs.getCharPref( savename ) )
            {
                return false;
            }

            return true;
        }
        catch(e)
        {
            alert('is attempt ok:\n' + e);
        }
        return false;
    },

    set_attempt_result: function( success )
    {
        try
        {
//             alert('set attempt result to: ' + success );

            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch("InstaBucket.");

            var pos = this.url_domain;
            var env = this.url_environment;
            var savename = 'security.attempt';
            savename += '.' + pos;
            savename += '.' + env;

            if( success )
                prefs.setCharPref( savename, 'OK' );
            else
                prefs.setCharPref( savename, 'FAIL' );
        }
        catch(e)
        {
            alert('attempt failed:\n' + e);
        }
    },

    // todo: this is being called too often, disconnect after the call.
    check_page_success: function()
    {
        try
        {
            dump('check page success was called\n');
            var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                .getService(Components.interfaces.nsIWindowMediator)
                                .getMostRecentWindow("navigator:browser");

            // todo: wait for page to load

            var currBrowser = currentWindow.getBrowser();
            dump('got current browser: ' + currBrowser + '\n');

            var contentDoc = currBrowser.contentDocument;
            dump('got content doc: ' + contentDoc + '\n');

            var currURL = currBrowser.currentURI.spec;
            dump('got current url: ' + currURL + '\n');

            // todo: this was getting here with null
            // when a page was slowly loading
            // we need to avoid going here with anything but the bucket check page.
            if( contentDoc == null || contentDoc.body == null )
                return;

            var page_content = contentDoc.body.innerHTML;
            dump('got page content of length: ' + page_content.length + '\n');

            var len = page_content.length;
            var success_index = page_content.indexOf('Abacus object successfully created in global.asa');

            dump( 'found Abacus object success... index = ' + success_index + ', overall len: ' + len + '\n');

            if( success_index > -1 )
            {
                // this ref not valid on event handlers.
                ExpWebReader.set_attempt_result( true );
            }

            // todo: what if the tab changes after the page is requested?
            // do we want to change back to the tab, or get the content even if not active?
            var tBrowser = top.document.getElementById("content");
            tBrowser.removeEventListener("DOMContentLoaded", this.check_page_success, true);
        }
        catch(e)
        {
//             alert('check page success:\n' + e);
            dump('check page success threw exception:\n' + e + '\n');
        }
        dump('check page success  :  exit\n');
    },

    try_recover_security_issue: function( experiment_id )
    {
        try
        {
            // this kind of worked
            // now that we have html parsing working, and abacus
            // stop using this option.
            return;


//             var retry_result_exp = null;

//             var prefs = Components.classes["@mozilla.org/preferences-service;1"]
//                     .getService(Components.interfaces.nsIPrefService)
//                     .getBranch("InstaBucket.");

//             var pos = this.url_domain;
//             var env = this.url_environment;

//             var savename = 'security.retry';
//             savename += '.' + pos;
//             savename += '.' + env;

//             // todo: mark success / failure based on results

//             prefs.setCharPref( savename, 'failed' );

//             var url = this.build_url_use_internal_domain( experiment_id );

//             var tBrowser = top.document.getElementById("content");
//             var tab = tBrowser.addTab(url);
//             tBrowser.selectedTab = tab;

//             // have this called when the page is done loading.
// //             this.check_page_success();

//             // todo: get a web page that talks about when it's called.

// //             if(gBrowser) gBrowser.addEventListener("DOMContentLoaded", this.onPageLoad, false);
//             tBrowser.addEventListener("DOMContentLoaded", this.check_page_success, false);

// //             tBrowser.addEventListener("DOMContentLoaded", global_method, false);
        }
        catch(e)
        {
            alert('try recover security issue:\n' + e);
        }
    },

    get_experiment: function( experiment_id )
    {
        var result_exp = null;

        try
        {
            dump('get experiment, id = ' + experiment_id + '\n');
            if( experiment_id < 0 )
            {
                dump( 'get experiment request fail, id less than zero: ' + experiment_id + '\n');
            }
            var url = this.build_url_use_internal_domain( experiment_id );

            if( g_tracing )
            {
                print("url to get experiment:\n" + url);
            }

            ExpWebReader.experiment_read = 0;
            // ExpWebReader.hit_web( url, this.got_results_back );
            result_exp = ExpWebReader.hit_web_more_direct( url );

            if( null == result_exp )
            {
                this.set_attempt_result( false );

                // try once to recover.
                // no, we don't want to open windows
                // but this value is used somewhere to know when not to use exp
                // this.try_recover_security_issue( experiment_id );
            }
            else
            {
                this.set_attempt_result( true );
            }
        }
        catch(e)
        {
            alert('get experiment:\n' + e);
        }

        // return ExpWebReader.experiment_read;
        return result_exp;
    },

    // input:   www.expedia.com  www.expedia.co.uk
    // output:  US               UK
    get_pos_from_domain: function( domain_in )
    {
        var pos = '';
        try
        {
            domain_in = domain_in.toUpperCase();

            dump( 'Get pos from domain, in:' + domain_in + '\n');

            // working when: get pos from domain: HTTP://WWW.EXPEDIA.CO.UK

            // whatever comes after the last period
            var domain_regex = /\.([^.]+)$/;
            var domain_match = domain_regex.exec( domain_in );

            //  last two anything after wwwexpedia
            var domain_regex_ppe = /WWWEXPEDIA.*(..)$/;
            var domain_match_ppe = domain_regex_ppe.exec( domain_in );

            var vsc_regex = /VOYAGES-SNCF/;
            var vsc_match = vsc_regex.exec( domain_in );

            if( null != vsc_match && vsc_match.length > 0 )
            {
                dump('found pos of VSC\n');
                pos = 'VSC';
            }

            if( pos.length < 1 && null != domain_match && domain_match.length > 1 )
            {
                pos = domain_match[1];
                dump('found domain match, for: ' + pos + '\n');
            }
            if( null != domain_match_ppe && domain_match_ppe.length > 1 )
            {
                pos = domain_match_ppe[1];
                dump('found domain match ppe, for: ' + pos + '\n');
            }
            if( pos.length < 1 )
            {
                dump('pos has length of zero, return blank\n');
                return '';
            }

            // few special cases.
            if( 'WWW.EXPEDIA.COM' == domain_in ||
                'WWWEXPEDIACOM' == domain_in )
            {
                pos = 'US';
                dump('found domain match for dot com, for: ' + pos + '\n');
            }

            var expedia_regex = /EXPEDIA/;
            var expedia_match = expedia_regex.exec( domain_in );

            if( null == expedia_match && pos != 'VSC' )
            {
                dump('no expedia match, and not vsc, so set to empty\n');
                pos = '';
            }
        }
        catch(e)
        {
            alert('get pos from domain:\n' + e);
        }

        dump( ' Calculated pos is:' + pos + '\n' );

        return pos;
    },

    // from the full url given
    // pull out these items:
    // POS
    //
    // todo: deal with url that has IP address
    //
    set_domain: function( url_domain_in )
    {
        try
        {
            // pull out the parts we want.

            var domain_pos = null;
            var domain_environ = '';

            // for getting experiment info
            // we always use the US dot com POS
            //
            // https://www.expedia.com/etcetera
            //         ^^^^^^^^^^^^^^^

            var core_part;

            var domain_regex = /https?:\/\/([^/]+)\//;
            var pull_url = domain_regex.exec( url_domain_in );
            if( null != pull_url && pull_url.length > 1 )
            {
                core_part = pull_url[1];
            }
            else
            {
                core_part = url_domain_in;
            }

            var environ_regex = /(.*)\.([^.]+\.(sb|bgb)\..*)/;
            var environ_ppe_regex = /(.*)\.(expediaweb\.com)/;
            var environ_about_regex = /^about/;

            var pull_pos_env = environ_regex.exec( core_part );
            var pull_pos_env_ppe = environ_ppe_regex.exec( core_part );
            var pull_pos_about = environ_about_regex.exec( core_part );

            if( pull_pos_about != null )
            {
//                 alert('ignoring page: ' + url_domain_in );
                return;
            }

            var match_type = 'none';

            if( null != pull_pos_env && pull_pos_env.length > 2 )
            {
                match_type = 'normal';
                domain_pos = pull_pos_env[1];
                domain_environ = pull_pos_env[2];
//                alert("pos: " + domain_pos + "\nenv: " + domain_environ);
            }
            if( null != pull_pos_env_ppe && pull_pos_env_ppe.length > 2 )
            {
                match_type = 'ppe';
                domain_pos = pull_pos_env_ppe[1];
                domain_environ = pull_pos_env_ppe[2];
            }
            if( domain_pos == null )
            {
                match_type = 'none';
                domain_pos = core_part;
                domain_environ = '';
            }

            // when testing, this works if set to:
            // match type: none
            // domain pos found: http://www.expedia.co.uk
            // domain env found:

            if( g_tracing )
            {
                print('match type: ' + match_type);
                print('domain pos found: ' + domain_pos);
                print('domain env found: ' + domain_environ );
            }
            else
            {
//                 alert('match type: ' + match_type +
//                       'domain pos found: ' + domain_pos +
//                       'domain env found: ' + domain_environ);
            }

            this.url_environment = domain_environ;
            this.pos = this.get_pos_from_domain( domain_pos );
            this.url_domain = domain_pos;

            // this causes a failure, certificates give problems.
            // https://www.expedia.com.estr34.bgb.karmalab.net/pubspec/scripts/setap.asp?abme=1044?d=1

            if( g_show_err_once && domain_environ.length > 0 )
            {
//                 alert("error message to be shown once.\n\nEnjoy");
//                 g_show_err_once = 0;
//                 this.url_domain += '.' + domain_environ;
            }

            // this is to prevent use of non live environments.
            // todo: make the choice at a better location.
//             if( domain_environ.length > 0 )
//             {
//                 this.url_domain = '';
//             }

/*

www.expedia.com.estr34.bgb.karmalab.net:433 uses an invalid security certificate.

The certificate is not trusted because it is self-signed.
The certificate is only valid for WWW.EXPEDIAREWARDS.COM.estr34.bgb.karmalab.net

(Error code: sec_error_ca_cert_invalid)

This could be a problem with the server's configuration or it could be someone trying to impersonate the server.

If you have connected to this server successfully in the past the error may be temporary and you can try again later.

certificate viewer:


*/




//             alert(' from: ' + url_domain + '\ncore: ' + core_part +
//                     '\ndomain pos: ' + domain_pos +
//                     '\npos = ' + this.pos +
//                     '\nthis url domain = ' + this.url_domain );

        }
        catch(e)
        {
            alert("set domain( " + url_domain_in + " ):\n" + e);
        }
    },
    // Abacus object successfully created in global.asa. <BR>
    // This page will return abacus value or error code.<BR>
    // abme: 1008<BR>IP: 10.186.8.167<BR>Hash: 9<BR>
    // GUID: 4DC781BDF2DE423380EEA44FE6332335<BR>
    // EAPID: 0<BR><BR>ABValueByID = 1<BR>

    extract_experiment: function( html )
    {
        var exp_result = null;
        try
        {
//                     print( 'yes 0' );
        // todo: make something more generic for pulling values
        // todo: how to construct a regex object?
        var experiment_id = "-1";
        var bucket = "-1";
        var ip_addr = "-1";
        var hash = "-1";
        var guid = "-1";
        var eapid = "-1";

//                     print( 'yes 1' );

        if( g_tracing ) print(' extract experiment a');

        // <BR>abme: 1008<BR>
        var exp_id_regex = /<BR>abme:\s+([^<]+)<BR>/;
        var exp_id_match = exp_id_regex.exec( html );

        if( g_tracing ) print(' extract experiment b');
        // <BR>IP: 10.186.8.167<BR>
        var exp_ipaddr_regex = /<BR>IP:\s+([^<]+)<BR>/;
        var exp_ipaddr_match = exp_ipaddr_regex.exec( html );

        if( g_tracing ) print(' extract experiment c');
        // <BR>Hash: 9<BR>
        var exp_hash_regex = /<BR>Hash:\s+([^<]+)<BR>/;
        var exp_hash_match = exp_hash_regex.exec( html );

        if( g_tracing ) print(' extract experiment d');
        // <BR>GUID: 4DC781BDF2DE423380EEA44FE6332335<BR>
        var exp_guid_regex = /<BR>GUID:\s+([^<]+)<BR>/;
        var exp_guid_match = exp_guid_regex.exec( html );

        if( g_tracing ) print(' extract experiment e');
        // <BR>EAPID: 0<BR>
        var exp_eapid_regex = /<BR>EAPID:\s+(\d)<BR>/;
        var exp_eapid_match = exp_eapid_regex.exec( html );

        if( g_tracing ) print(' extract experiment f');
        // <BR>ABValueByID = 1<BR>
        var exp_bucket_regex = /<BR>ABValueByID.=.(\d)<BR>/;
        var exp_bucket_match = exp_bucket_regex.exec( html );

        if( g_tracing ) print(' extract experiment g');
        if( g_tracing )
        {
            print(' exp id: ' + exp_id_match );
            print(' exp bucket: ' + exp_bucket_match);
        }
        if( exp_id_match.length > 0 )
        {
            experiment_id = exp_id_match[1];
            dump('extract experiment found exp id of: ' + experiment_id + '\n');
        }
        else
        {
            dump('extract experiment failed to find exp id\n');
        }
        if( g_tracing ) print(' extract experiment h');

        exp_result = new WebExperiment(experiment_id)

        if( exp_ipaddr_match.length > 0 )
        {
            exp_result.ipaddr = exp_ipaddr_match[1];
        }
        if( g_tracing ) print(' extract experiment i');
        if( exp_hash_match.length > 0 )
        {
            exp_result.hash = exp_hash_match[1];
        }
        if( g_tracing ) print(' extract experiment j');
        if( exp_guid_match.length > 0 )
        {
            exp_result.guid = exp_guid_match[1];
        }
        if( g_tracing ) print(' extract experiment k');
        if( exp_eapid_match.length > 0 )
        {
            exp_result.eapid = exp_eapid_match[1];
        }
        if( g_tracing ) print(' extract experiment l');
        if( exp_bucket_match.length > 0 )
        {
            exp_result.bucket = exp_bucket_match[1];
            dump('extract experiment found bucket of: ' + exp_result.bucket + '\n');
        }
        else
        {
            dump('extract experiment failed to find bucket\n');
        }
        if( g_tracing ) print(' extract experiment m');
        }
        catch(e)
        {
            // ;
            if( g_tracing )
            {
                print('exception pulling out html text');
                print(e);
            }
        }

        return exp_result;

    },

    build_url_use_internal_domain: function( exp_id )
    {
        return this.build_url( this.url_domain, exp_id );
    },

    build_url: function( domain, exp_id )
    {
        var result = '';
        try
        {
            if( exp_id < 0 )
            {
                dump('build url fail, exp id less than zero:' + exp_id + '\n');
            }
            if( g_tracing ) print('build url with: ' + domain + ' ' + exp_id );

            if( "undefined" == typeof( domain ) || domain.length < 1 ||
                "undefined" == typeof( exp_id ) || exp_id.length < 1 )
            {
                return '';
            }


            if( this.url_environment.length > 0 )
            {
                domain += '.' + this.url_environment;
            }

            result = this.url_template;
            result = result.replace( '{domain}', domain );
            result = result.replace( '{exp_id}', exp_id );

//             regex_pull_appart = /^(.*){domain}(.*){exp_id}(.*)$/;
//             match_url = regex_pull_appart.exec( url_template );
//             result = match_url[1] + domain + match_url[2] + exp_id + match_url[3];

        }
        catch(e)
        {
            alert('build url:\n' + e );
        }

        return result;
    },

    web_hit: function()
    {
        call_this_guy( httpRequest );
    },

    // todo: clean this up, make unique sessions, something?
    // calls to "get" are sometimes
    // grabbing the result from previous or next request
    // requesting id a, getting back id b.

    hit_web_more_direct: function( url )
    {
        var result_exp = null;
        try
        {
            dump('hit web more direct, url = ' + url + '\n');
//             if (window.XMLHttpRequest)
//             {
//                 // Mozilla, Safari, ...
//                 httpRequest = new XMLHttpRequest();
//             }
//             else if (window.ActiveXObject)
//             {
//                 // IE
//                 httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
//             }
            httpRequest = ExpBucketSetter.get_http_obj();

            var async = false;
            httpRequest.open('GET', url, async);

            try
            {
                var send_result = httpRequest.send(null);
//                 dump('http request gave result:' + send_result + '\n');

// this gives a boat load of trace output, probably not helpful.
//                 dump('httpRequest values:\n');
//                 for( var key in httpRequest )
//                 {
//                     dump( key + ' = ' + httpRequest[key] + '\n' );
//                 }

                if( g_tracing )
                    print( 'http request back:\n' + httpRequest.responseText );

                // todo: listen for the right stuff, not the entire page.
                // this is sometimes getting the huge entire web page
//                 dump('response text = ' + httpRequest.responseText + '\n');

                dump('response text length: ' + httpRequest.responseText.length + '\n');

                // response should be around 230 in length

                // todo: find out why the length is too long.
                if( httpRequest.responseText.length > 1000 )
                {
                    httpRequest = ExpBucketSetter.get_http_obj();
                    httpRequest.open('GET', url, async);
                    send_result = httpRequest.send(null);
                    dump('retry: response text length: ' + httpRequest.responseText.length + '\n');
                }


                if( httpRequest.responseText.length < 1000 )
                {
                    result_exp = ExpWebReader.extract_experiment( httpRequest.responseText );
                }

                dump('hit web more direct, result_exp = ' + result_exp + '\n');
            }
            catch(e)
            {
                dump('http request send threw an exception:\n' + e + '\n');
                // gives failure code 0x80004005 when offline
    //            alert('hit web more direct:\n' + e);
                // when offline, this throws
                // todo: detect if offline.
            }
        }
        catch(e)
        {
            alert('hit web more direct:\n' + url + '\n' + e);
        }

        return result_exp;
    },

    // todo: support async calls.
    //
    // break out into an array of http request objects
    // each running in parallel.
    // each unique to some request index.
    hit_web_async: function( url, callme )
    {
//         if (window.XMLHttpRequest)
//         {
//             // Mozilla, Safari, ...
//             httpRequest = new XMLHttpRequest();
//         }
//         else if (window.ActiveXObject)
//         {
//             // IE
//             httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
//         }
            httpRequest = ExpBucketSetter.get_http_obj();

        try
        {
            var async = true;
            httpRequest.open('GET', url, async);

            // todo: notice that repData argument is ignored
            // rather we use the http request guy.

            httpRequest.onreadystatechange = function (repData)
                {
                    if (httpRequest.readyState == 4) {
                        if(httpRequest.status == 200)
                        {
                            // alert('back with data ' + httpRequest.length);
                            // print(req.responseText);
                            var exp_result = ExpWebReader.extract_experiment(
                                httpRequest.responseText );

                            callme( exp_result.id , exp_result.bucket );
                        }
                        else
                        {
                            if( g_tracing) print("Error loading page\n");
                        }
                    }
                };

            httpRequest.send(null);
            if( g_tracing )
                print( 'http request back:\n' + httpRequest.responseText );
        }
        catch(e)
        {
            alert('hit web async:\n' + e);
        }
    },

    hit_web: function( url, callme )
    {
//        var httpRequest;
        call_this_guy = callme;

        if( g_tracing )
        {
            print(" hit web with url: " + url );
        }

        // alert(" hit web with url: " + url );

//         if (window.XMLHttpRequest)
//         {
//             // Mozilla, Safari, ...
//             httpRequest = new XMLHttpRequest();
//         }
//         else if (window.ActiveXObject)
//         {
//             // IE
//             httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
//         }

            httpRequest = ExpBucketSetter.get_http_obj();

//         httpRequest.onreadystatechange = this.web_hit;

        var async = false;
        httpRequest.open('GET', url, async);

        try
        {
            httpRequest.send(null);
        }
        catch(e)
        {
            // when offline, this throws
            // todo: detect if offline.
        }


    },



}


if( g_testing )
{

    function test_set_bucket_via_cookie()
    {
        // ExpWebReader.set_domain( 'http://www.expedia.co.uk' );
        ExpWebReader.set_domain( 'http://www.expedia.com' );

        var id = 1079;
        var bucket = 1;

        ExpBucketSetter.set_bucket( id, bucket );
    }

    test_set_bucket_via_cookie();



    function regextrials()
    {
        try
        {
            var url_ca = 'http://www.expedia.ca/daily/enc4105/home/default.asp?l=4105';
            var url_us = 'http://www.expedia.com/default.asp';
            var url_uk = 'http://www.expedia.co.uk/n.hundefuned.Hotel-Information';

            var domain_regex = /https?:\/\/([^/]+)/;

            var dca = domain_regex.exec( url_ca );
            var dus = domain_regex.exec( url_us );
            var duk = domain_regex.exec( url_uk );

            print("ca: " + dca);
            print("us: " + dus);
            print("uk: " + duk);

            var environ_regex = /(.*)\.([^.]+\.(sb|bgb)\..*)/;
            // anything, dot, not dots, dot, sb or bgb, dot, anything
//            var environ_regex = /(.*)\.([^.]+\.(sb|bgb)\..*)/;

            var zca = environ_regex.exec( url_ca );
            var zus = environ_regex.exec( url_us );
            var zuk = environ_regex.exec( url_uk );

            print("ca: " + zca);
            print("us: " + zus);
            print("uk: " + zuk);
        }
        catch(e)
        {
            print("reg ex trials:\n" + e);
        }
    }

    function try_exp_stuff()
    {

        print("start testing");


    //    var url_to_set_domain = 'http://www.expedia.com.estr09.sb.karmalab.net/pub/agent.dll/qscr=fctl/abme=1044/abmv=0';
    //    var url_to_set_domain = 'http://www.expedia.com.estr09.bgb.karmalab.net/n.h201272.Hotel-Information?chkin=08%2F08%2F2011&chkout=08%2F11%2F2011&rm1=a1:c3:c4';
    //    var url_to_set_domain = 'http://wwwexpediait.expediaweb.com/Cascate-Del-Niagara-Hotel-Radisson-Hotel-Suites-Fallsview.h201272.Informazioni-Hotel?chkin=08%2F08%2F2011&chkout=08%2F11%2F2011&rm1=a1%3Ac3%3Ac4';
        var url_to_set_domain = 'http://wwwexpediacom.expediaweb.com/Niagara-Falls-Hotels-Radisson-Hotel-Suites-Fallsview.h201272.Hotel-Information?chkin=08%2F08%2F2011&chkout=08%2F11%2F2011&rm1=a1%3Ac3%3Ac4';
        print( 'calling set domain with:' );
        print( url_to_set_domain );
        ExpWebReader.set_domain( url_to_set_domain );

        print( 'domain set to: ' + ExpWebReader.url_domain );
        print( 'envirn set to: ' + ExpWebReader.url_environment );
        print( 'pos    set to: ' + ExpWebReader.pos );


    //    regextrials();

        var exps = new Array();

        exps.push( ExpWebReader.get_experiment('1008') );
    //     exps.push( ExpWebReader.get_experiment('1044') );
    //     exps.push( ExpWebReader.get_experiment('1078') );
    //     exps.push( ExpWebReader.get_experiment('1062') );
    //     exps.push( ExpWebReader.get_experiment('1066') );

        print( "domain: " + ExpWebReader.url_domain );
        for( var i = 0 ; i < exps.length ; i ++)
        {
            print( "experiment id: " + exps[i].id + " bucket: " + exps[i].bucket );
        }

        var e = ExpWebReader.get_experiment('1008');
        try
        {
            e.dump(1);
        }
        catch(e)
        {
            alert("exception:\n" + e);
        }

        print("done testing");
    }

    if( g_tracing )
    {
    function results_back( httpRequest )
    {
        print( "back with: " + httpRequest.readyState );

        if( httpRequest.readyState < 4 )
            return;

        if( httpRequest.status === 200 )
        {
            // good to go
        }
        else
        {
            print( "status: " + httpRequest.status );
            return;
        }

        print("ready!");
        print(" ");
        print("text: \n" + httpRequest.responseText);
        // print("xml: \n" + httpRequest.responseXML);

        print( 'getting exp extracted' );

        var e;
        try
        {
            e = ExpWebReader.extract_experiment( httpRequest.responseText );
        }
        catch(e)
        {
            print("extracting: " + e);
        }

        print("got e back");
        print("e experiment id: " + e.id);

        e.dump(1);

    }

//     try
//     {
//         var expz = new WebExperiment( "2" )
//         expz.dump(1);
//     }
//     catch(e)
//     {
//         print("creating experiment:\n" + e);
//     }

//     var url = ExpWebReader.build_url( 'zzz.zzz.zzz', '987' );
//     print( url );

//     url = ExpWebReader.build_url( 'www.expedia.com', '1008' );
//     print( url );

//     ExpWebReader.hit_web( url, results_back );
    }



}


var ExpOmnitureReader =
{
    tag_data: new Array(),

    gatherTags: function()
    {
    },

    sampleCode: function()
    {
        var j=document.styleSheets;
        var i=document.images;
        var r='';
        for( var x=0 ; x<j.length ; x++)
        {
            if(j[x].imports)
            {
                for(var y=0 ; y<j[x].imports.length ; y++)
                {
                    if( j[x].imports[y].href.toLowerCase().indexOf('/b/ss/') >= 0 )
                    {
                        // 22 == "
                        // r += j[x].imports[y].href + %22\n\n%22;
                        r += j[x].imports[y].href + "\n\n";
                    }

                    for(var x=0 ; x < i.length ; x++)
                    {
                        if(i[x].src.toLowerCase().indexOf('/b/ss/') >= 0)
                        {
                            r += i[x].src + "\n\n";
                        }
                    }

                    for(w_m in window)
                    {
                        if( w_m.substring(0,4) == 's_i_' && window[w_m].src)
                        {
                            if(window[w_m].src.indexOf('/b/ss/') >= 0)
                                r+=window[w_m].src;
                        }
                    }

                    void(alert(unescape(r).replace(/&/g,'\n')))

                }

            }
        }
    },
}

