
var g_testing = false;

function init_cookies_pane()
{
    try
    {
        var display_url = 'http://www.expedia.com'

        var url = InstaBucket.get_current_url();

        if( url.length > 0 )
        {
            display_url = url;
        }

        display_url = clean_url( display_url );

        document.getElementById('cookie-manual-url').value = display_url;
    }
    catch(e)
    {
        alert(' init cookies pane:\n' + e);
    }
}

function clean_url( url )
{
    try
    {
        if( url.indexOf( 'http' ) < 0 )
        {
            url = 'http://' + url;
        }

        var regex = /(http:\/\/[^/]+).*$/;
        var match = regex.exec( url );
        if( match != null && 'undefined' != typeof( match ) &&
            match.length > 1 )
        {
            dump('changing url from: ' + url );
            url = match[1];
            dump(' to: ' + url + '\n');
        }
        else
        {
            dump('did not match url: ' + url + '\nmatch = ' + match);
        }
    }
    catch(e)
    {
        alert('clean url:\n' + e);
    }
    return url;
}

function on_manual_url_go()
{
    try
    {
        var url = document.getElementById('cookie-manual-url').value;

        var cookies = get_cookies( url );

        var p1_chunks = extract_linfo( cookies );

        var gacct = '';
        var lang_id = '';
        var exp_id = '';
        var exp_bucket = '';

        if( null != p1_chunks && p1_chunks.length > 20 )
        {
            gacct = p1_chunks[0];

            lang_id = p1_chunks[13];
            exp_id = p1_chunks[19];
            exp_bucket  = p1_chunks[21];
        }
        var guid_stuff = cookies['MC1'];

        var cookie_list_items = new Array();

//         cookie_list_items.url = url;

        for( var key in cookies )
        {
            cookie_list_items[key] = cookies[key];
        }


//         cookie_list_items.gacct = gacct;
//         cookie_list_items.lang_id = lang_id;
//         cookie_list_items.exp_id = exp_id;
//         cookie_list_items.exp_bucket = exp_bucket;
//         cookie_list_items.guid = guid_stuff;



        var cookie_list = document.getElementById('cookie-big-list');
        cookie_list.selectedIndex = -1;
        var maxTry = cookie_list.itemCount;

        while( maxTry-- > 0 )
        {
            try
            {
                cookie_list.removeItemAt(0);
            }
            catch(e)
            {
                dump("**exception** removing elements from cookie listbox:\n" + e + '\n');
                break;
            }
        }

        for( var item in cookie_list_items )
        {
            var row = document.createElement('listitem');
            row.setAttribute('value', item + '=' + cookie_list_items[item]);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', item);
            row.appendChild(cell);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', cookie_list_items[item]);
            row.appendChild(cell);

            var appended = cookie_list.appendChild(row);
        }

        var exp_name = '???';
        var experiment = InstaBucket.find_exp_with_id( exp_id );

        if( "undefined" == typeof( experiment ) || null != experiment )
        {
            exp_name = experiment.full_name;
        }

        if( exp_name.length > 25 )
        {
            exp_name = exp_name.substr(0,25);
        }

        document.getElementById('cookie-experiment-caption').label = 'forced bucket: ' + exp_name;

        document.getElementById('cookie-experiment-id').value = exp_id;
//         document.getElementById('cookie-experiment-name').value = exp_name;
        document.getElementById('cookie-experiment-bucket').value = exp_bucket;

    }
    catch(e)
    {
        alert('on manual url go:\n' + e);
    }
}

function on_select_cookie_big()
{
    try
    {
        var cookie_list = document.getElementById('cookie-big-list');
        var show_text = cookie_list.value;

        document.getElementById('cookienew1' ).value = show_text;
    }
    catch(e)
    {
        alert('on select cookie big:\n' + e);
    }
}



function get_cookies( url )
{
    try
    {
        var key_value_pairs = new Array();

        var ios = Components.classes["@mozilla.org/network/io-service;1"]
            .getService(Components.interfaces.nsIIOService);
        var uri = ios.newURI(url, null, null);
    //     var uri = ios.newURI("http://www.google.com/", null, null);
        var cookieSvc = Components.classes["@mozilla.org/cookieService;1"]
            .getService(Components.interfaces.nsICookieService);
        var cookies = cookieSvc.getCookieString(uri, null);

        if( null == cookies )
        {
            return key_value_pairs;
        }

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
        dump('**exception** pref dlg get cookies:\n' + e + '\n');
    }
    return key_value_pairs;
}

// US = http://www.expedia.com
// p1 = `gacct=v.1,91,215843705`tpid=v.1,1`airp=v.1,SEA`linfo=v.4,|0|0|255|1|0||||||||1033|0|0||0|0|1062|-1|1`101
// linfo=v.4,|0|0|255|1|0||||||||1033|0|0||0|0|1062|-1|1
//
// CA = http://www.expedia.ca
// p1 = `gacct=v.1,13,215845731`tpid=v.1,4`linfo=v.4,|0|0|255|1|0||||||||4105|0|0||0|0|1080|-1|1`88
// linfo=v.4,|0|0|255|1|0||||||||4105|0|0||0|0|1080|-1|1
//
// JP = http://www.expedia.co.jp
// p1 = `tpid=v.1,1`linfo=v.4,|0|0|255|1|0||||||||1033|0|0||0|0|0|-1|-1`63
//
function extract_linfo( cookies )
{
    var linfo_items = null;

    var p1_cookie = cookies.p1;
    var linfo = cookies.linfo;

    if( "undefined" == typeof( p1_cookie ) && "undefined" == typeof( linfo ) )
        return null;

    if( "undefined" != typeof( linfo ) )
    {
        linfo_items = linfo.split('|');
        return linfo_items;
    }

    var result = new Array();
    result.gacct = null;


    var p1_chunks = p1_cookie.split('`');
    var tpid_index = 0;

    var count = p1_chunks.length;

    for( var i = 0 ; i < count ; i ++)
    {
        var chunk = p1_chunks[i];

        result.last = chunk;

        // todo: dynamically generate the regular expression.
        var regex_gacct = /gacct=/;
        var match_gacct = regex_gacct.exec( chunk );

        if( match_gacct != null )
        {
            result.gacct = chunk;
            continue;
        }

        var regex_tpid = /tpid=/;
        var match_tpid = regex_tpid.exec( chunk );

        if( match_tpid != null )
        {
            result.tpid = chunk;
            continue;
        }

        var regex_linfo = /linfo=/;
        var match_linfo = regex_linfo.exec( chunk );

        if( match_linfo != null )
        {
            result.linfo = chunk;
            continue;
        }
    }

    if( "undefined" != typeof( result.linfo ) && null != result.linfo )
    {
        linfo_items = result.linfo.split('|');
    }


    return linfo_items;
}

function on_cookie_prep_exp()
{
    var exp_id = document.getElementById('cookie-experiment-id').value;
    var bucket = document.getElementById('cookie-experiment-bucket').value;

    var url = document.getElementById('cookie-manual-url').value;

    // alert('url:' + url + ' id: ' + exp_id + ' bucket: ' + bucket );

    force_exp_bucket_via_cookie( url, exp_id, bucket );
}

function prep_cookie( cookie_txt, exp_id, bucket )
{
    var result = '';

    try
    {
        if( g_testing ) print( 'scanning: ' + cookie_txt );

        var regex = /^(.*?\|)[^|]*\|[^|]*\|[^|]*?(`.*)?$/
//        var regex = /^(.*)$/;
//        var regex = /(.*)/;

        var match = regex.exec( cookie_txt );

        if( match != null && match.length > 1 )
        {
            // insert  experiment_id|-1|bucket

            result = match[1] + exp_id + '|-1|' + bucket;

            if( match.length > 2 && "undefined" != typeof( match[2] ) )
            {
                var len = result.length;
                result += '`' + len;
            }
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
}

// todo: clean up the url, removing trailing stuff after the http://www.domain.com/
function on_cookie_set( index )
{
    try
    {
        var cookie_txt = document.getElementById('cookienew' + index).value;
        var url = document.getElementById('cookie-manual-url').value;

        var regex = /^([^=]+)=(.*)$/; // looking for  kkkkkkk=vvvvvvvvvvvvvvvvvvvvvvvv
        var match = regex.exec( cookie_txt );

        if( null == match || match.count < 3 )
        {
            alert('must have  name=value');
            return;
        }

        var cookie_name = match[1];
        var cookie_value = match[2];

        var cookies = new Array();
        cookies[ cookie_name ] = cookie_value;

        var domain = calcualte_domain( url );
        set_cookies( url, domain, cookies );
    }
    catch(e)
    {
        alert('on cookie set:\n' + e);
    }
}

function force_exp_bucket_via_cookie( url, exp_id, bucket )
{
    try
    {
        var set_these_cookies = new Array();

        var cookies = get_cookies( url );

        var p1_cookie = cookies.p1;
        var linfo = cookies.linfo;

// p1 = `gacct=v.1,13,215845731`tpid=v.1,4`linfo=v.4,|0|0|255|1|0||||||||4105|0|0||0|0|1080|-1|1`88
// linfo=v.4,|0|0|255|1|0||||||||4105|0|0||0|0|1080|-1|1

        if( "undefined" != typeof( p1_cookie ) )
        {
            var new_p1 = prep_cookie( p1_cookie, exp_id, bucket );
            if( new_p1.length > 0 )
                set_these_cookies.p1 = new_p1;
        }

        if( "undefined" != typeof( linfo ) )
        {
            var new_linfo = prep_cookie( linfo, exp_id, bucket );
            if( new_linfo.length > 0 )
                set_these_cookies.linfo = new_linfo;
        }

        var edit_index = 0;
        for( var c in set_these_cookies )
        {
            var cookie_txt = c + '=' + set_these_cookies[c];
            var control_id = 'cookienew' + edit_index;
            var control = document.getElementById( control_id );
            if( control != null && 'undefined' != typeof( control ) )
                control.value = cookie_txt;
        }
    }
    catch(e)
    {
        alert(' force bucket via cookie:\n' + e);
    }
}

function calcualte_domain( url )
{
    var domain = url;
    try
    {
        domain = domain.replace('http://www.', '.');
        // domain = url.replace('http://wwwexpedia', '.wwwexpedia');
        domain = domain.replace('/.*?wwwexpedia/', '.wwwexpedia');
        dump('calculated url, was: ' + url + ' domain: ' + domain + '\n' );
    }
    catch(e)
    {
        alert('calculate domain:\n' + e);
    }
    return domain;
}

// all cookies are treated as domain cookies
// the path is always root, or /
// a cookie is changed by first removing it, then adding it back
// expire date is hard coded to July 4, 2016
//
function set_cookies( url, domain, cookies )
{
    try
    {
        dump('set cookies for\n  url: ' + url + '\n  domain: ' + domain + '\n');

        var cookieUri = Components.classes["@mozilla.org/network/io-service;1"]
            .getService(Components.interfaces.nsIIOService)
            .newURI(url, null, null);
        var expire_date = 'Mon, 04 Jul 2016 06:38:28 GMT';
        var path = '/';
        var blocked = false;

        for( var cookie_key in cookies )
        {
            dump('removing cookie:' + '\n  host: ' + domain + '\n  name: ' + cookie_key +
                    '\n  path: ' + path + '\n  blocked: ' + blocked + '\n');

            // when hitting a url via IP address, setting the cookie was failing,
            // the web developer firefox extension deletes the cookie before adding it back.
            // todo wd: shows other web developer items to try.

            // todo: we may need a leading dot for the domain, if this is a domain cookie
            Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager).
                remove(domain, cookie_key, path, blocked);
//          remove(in AUTF8String aHost, in ACString aName, in AUTF8String aPath, in boolean aBlocked);

            // var cookieString = "your_key_name=your_key_value;domain=.example.com;expires=Thu, 15 Jan 2009 15:24:55 GMT";
            var cookieString = cookie_key + "=" + cookies[cookie_key];
            if( domain.charAt(0) == "." )
            {
                cookieString += ";domain=" + domain; // todo wd: only keep if domain, first character a period
            }
            cookieString += ";path=" + path;
            cookieString += ";expires=" + expire_date; // todo wd: remove if session cookie

            var out_edit = document.getElementById('set-cookie-text');
            if( out_edit != null && typeof( out_edit ) != 'undefined' )
            {
                out_edit.value = cookieString;
            }

            if( g_testing ) print( 'new cookie string: ' );
            if( g_testing ) print(cookieString);

            dump('setting cookie string:\n  ' + cookieString + '\n');

            var nsIURI = cookieUri;
            var nsIPrompt = null;
            var aCookie = cookieString;
            var nsIChannel = null;

            Components.classes["@mozilla.org/cookieService;1"]
                .getService(Components.interfaces.nsICookieService)
                .setCookieString(cookieUri, null, cookieString, null);
        }
    }
    catch(e)
    {
        alert('set cookies:\n' + e);
    }
}



if( g_testing )
{
    function set_cookie()
    {
//         force_exp_bucket_via_cookie( 'http://www.expedia.co.uk', '1112', '1' );
//         force_exp_bucket_via_cookie( 'http://www.expedia.co.uk', '1079', '1' );
        force_exp_bucket_via_cookie( 'http://www.expedia.co.uk', '1079', '2' );
    }

    function try_reg_ex()
    {
        var p1_cookie = 'v.4,|0|0|255|1|0||||||||2057|0|0||0|0|1112|-1|0';
        var exp_id = '1414';
        var bucket = '1';

        if( g_testing ) print( 'pre change: ' + p1_cookie );

        // var regex = /^(.*?\|)[^\|]*\|[^\|]*\|[^\|]*$/
        var regex = /^(.*?\|)[^|]*\|[^|]*\|[^|]*$/
        var match = regex.exec( p1_cookie );

        for( var i in match )
        {
            print( 'match[' + i + '] : ' + match[i] );
        }

        if( match != null && match.length > 1 )
        {
            // insert  experiment_id|-1|bucket

            var new_linfo = match[1] + exp_id + '|-1|' + bucket;

            if( g_testing ) print( 'linfo changed: ' + new_linfo );
        }
    }

    function try_reg_ex()
    {
        var cookie_txt = 'v.4,|0|0|255|1|0||||||||2057|0|0||0|0|1112|-1|0';
        var exp_id = 1113;
        var bucket = 1;
        var cookie_changed = prep_cookie( cookie_txt, exp_id, bucket )

        print('pre: ' + cookie_txt);
        print('pst: ' + cookie_changed);

        var cookie_txt_us = 'linfo=v.4,|0|0|255|1|0||||||||1033|0|0||0|0|1078|-1|1`101';

        var cookie_changed_us = prep_cookie( cookie_txt_us, exp_id, bucket )

        print('pre: ' + cookie_txt_us);
        print('pst: ' + cookie_changed_us);
    }

    set_cookie();

    // try_reg_ex();

}


