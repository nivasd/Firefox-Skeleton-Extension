
// populate the list of groupings

function init_url_pane()
{
    try
    {
        update_url_group_stuff();
    }
    catch(e)
    {
        alert('init all pane:\n' + e);
    }
}

function update_url_group_stuff()
{
    try
    {
        // grouping-dropdown
        var active_group_name = InstaBucket.get_active_group_name();

        if( active_group_name.length < 1 )
        {
            active_group_name = 'default';
        }

        var names = InstaBucket.load_group_exp_tla_names( active_group_name );

        var names_found = 0;

        for( var i = 0 ; i < names.length ; i++)
        {
            var en = names[i];
            if( en.length > 0 )
                names_found++;
        }

        if( names_found < 1 )
        {
            prepare_default_grouping( active_group_name );

            InstaBucket.set_active_group_name( active_group_name );
        }

        var grouping_dropdown = document.getElementById( 'url-grouping-dropdown' );
        grouping_dropdown.removeAllItems();

        var group_names = InstaBucket.get_all_group_names( );

        var select_this_item = null;

        for( var i = 0 ; i < group_names.length ; i ++)
        {
            var gn = group_names[i];
            var item = grouping_dropdown.appendItem( gn, gn );

            if( gn == active_group_name )
                select_this_item = item;
        }

        fill_env_control();
//         alert('active group name is: ' + active_group_name );

//         grouping_dropdown.ensureElementIsVisible( select_this_item );
//         grouping_dropdown.selectItem( select_this_item );
        grouping_dropdown.selectedItem = select_this_item;

        on_select_url_group();
    }
    catch(e)
    {
        alert( 'update group stuff:\n' + e);
    }
}

function fill_env_control()
{
    var env_list = document.getElementById('url-env-dropdown');
    env_list.removeAllItems();

    var env_def = [
        {eName: 'Live', eURL: '' },
        {eName: 'RC', eURL: 'rc01.sb.karmalab.net' },
        // {eName: 'Farm34', eURL: 'estr34.bgb.karmalab.net' },
        {eName: 'Farm34', eURL: 'chelwebestr34.bgb.karmalab.net' },
        {eName: 'Farm09', eURL: 'estr09.sb.karmalab.net' },
        {eName: 'Local', eURL: 'localhost' },
        {eName: 'SandBox', eURL: 'sandbox.dev.sb.karmalab.net' },
        {eName: 'ppe', eURL: 'expediaweb.com' },
        {eName: 'main', eURL: 'main01.sb.karmalab.net' },
        {eName: 'hotfix', eURL: 'hf01.sb.karmalab.net' }
    ];

    for( var i = 0 ; i < env_def.length ; i ++)
    {
        var env = env_def[i];

        env_list.appendItem( env.eName, env.eURL );
    }
}

function prepare_default_grouping( group_name )
{
    try
    {
        // assume the user has never used groupings
        // add one with all the current items.

    //     alert('preparing default grouping for:' + group_name );

        var names = new Array();

        for(var i = 0 ; i < 20 ; i ++)
        {
            var exp_tla = InstaBucket.load_exp_pref_index( i );
            if( exp_tla.length < 1 )
                continue;

            names.push( exp_tla );
        }

        InstaBucket.save_group_exp_tla_names( group_name, names );
    }
    catch(e)
    {
        alert('prepare default grouping:\n' + e);
    }
}

function on_select_url_group()
{
    try
    {
        var grouping_dropdown = document.getElementById( 'url-grouping-dropdown' );

        var group_name = grouping_dropdown.label;

        var names = InstaBucket.load_group_exp_tla_names( group_name );

        populate_url_exp_list( names );
    }
    catch(e)
    {
        alert('on select group:\n' + e);
    }
}

function populate_url_exp_list( names )
{
    try
    {
        var exp_list = document.getElementById('url-exp-list');
        exp_list.selectedIndex = -1;

        var maxTry = exp_list.itemCount;

        dump('removing ' + maxTry + ' items from url exp list\n');

        while( maxTry-- > 0 )
        {
            try
            {
                exp_list.removeItemAt(0);
            }
            catch(exception)
            {
                alert("exception removing elements from tla listbox:\n" + exception);
                break;
            }
        }

        // todo: get config value to show long / short
        var show_long_name = document.getElementById('basics-status-bar-official-names').checked;

        dump('show long name: ' + show_long_name + '\n');

        dump('names count: ' + names.length + '\n');

        for( var i = 0 ; i < names.length ; i ++)
        {
            var lookup_name = names[i];
            var view_name = names[i];

            var eb = InstaBucket.load_exp_pref_tla( lookup_name );
            if( eb == null )
            {
                dump('cannot show url exp, load exp pref tla for ' +
                    lookup_name + ' returned null\n' );

                continue;
            }

            if( show_long_name )
            {
                view_name = eb.full_name;
                view_name = InstaBucket.inject_spaces( view_name );
            }
//             exp_list.appendItem(view_name, lookup_name);

            var exp_short_name = eb.tla;
            var exp_name = view_name;
            var pos_count = eb.get_pos_count();

            var row = document.createElement('listitem');
            row.setAttribute('value', exp_short_name);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', exp_name);
            row.appendChild(cell);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', pos_count);
            row.appendChild(cell);

            var appended = exp_list.appendChild(row);
        }

        exp_list.selectedIndex = 0;
    }
    catch(e)
    {
        alert('populate all exp list:\n' + e);
    }
}

function on_select_url_experiment()
{
    try
    {
        var exp_list = document.getElementById('url-exp-list');
        var pos_list_box = document.getElementById('url-pos-list');

        var maxTry = pos_list_box.itemCount;

        pos_list_box.selectedIndex = -1;

        while( maxTry-- > 0 )
        {
            try
            {
                pos_list_box.removeItemAt(0);
            }
            catch(exception)
            {
                alert("exception removing elements from exp listbox:\n" + exception);
                break;
            }
        }

        var eb = null;

        var selection = exp_list.selectedIndex;

//         alert('selection is: ' + selection);

        if( selection < 0 )
            return;

        var item = exp_list.getItemAtIndex( selection );
//         alert('item selected:' + item.value);
        eb = InstaBucket.load_exp_pref_tla( item.value );

        for(var i = 0 ; i < 4 ; i ++)
        {
            var button_text = eb.get_bucket_name( i );
            var button_id = 'url-bucket-' + i;
            var button = document.getElementById(button_id);
            if( button == null )
                continue;
            button.label = button_text;
            button.style.fontWeight = '';
            // we have the option of highlighting the current bucket
//             button.style.fontWeight = 'bold';
        }

        var pos_list = eb.get_pos_array();
        var pos_count = pos_list.length;

        for(var i = 0 ; i < pos_count ; i ++)
        {
            var pos = pos_list[i];
            var id = eb.get_pos_id( pos );
            var bucket = 0;
            var bucket_text = eb.get_bucket_name( bucket );
            var is_forced = false;

            var row = document.createElement('listitem');
            row.setAttribute('value', pos);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', pos);
            row.appendChild(cell);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', id);
            row.appendChild(cell);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', bucket);
            row.appendChild(cell);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', bucket_text);
            row.appendChild(cell);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', is_forced);
            row.appendChild(cell);

            var appended = pos_list_box.appendChild(row);
        }

        pos_list_box.selectedIndex = 0;
    }
    catch(e)
    {
        alert('on select all experiment:\n' + e);
    }
}

function on_select_url_pos()
{
    try
    {
//         alert('select pos');
        var pos_list = document.getElementById('url-pos-list');
        on_update_urls();
    }
    catch(e)
    {
        alert('on select all pos:\n' + e);
    }
}

function on_select_url_env()
{
    try
    {
        on_update_urls();
    }
    catch(e)
    {
        alert('on select all env:\n' + e);
    }
}

function launch_url_in_ie( url )
{
    try
    {
        // todo: write code to generate the script to run.
        var app_path = "C:\\dev\\js\\open_ie8\\open_single_ie8.bat";

        // create an nsILocalFile for the executable
        var file = Components.classes["@mozilla.org/file/local;1"]
                             .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(app_path);

        // create an nsIProcess
        var process = Components.classes["@mozilla.org/process/util;1"]
                                .createInstance(Components.interfaces.nsIProcess);
        process.init(file);

        // Run the process.
        // If first param is true, calling thread will be blocked until
        // called process terminates.
        // Second and third params are used to pass command-line arguments
        // to the process.
        var args = [url];
        process.run(false, args, args.length);

        alert('waiting a bit');
    }
    catch(e)
    {
        alert('launch url in ie:\n' + url + '\n' + e);
    }
}

function on_get_ie()
{
    var get_url = document.getElementById('url-get-exp-url').value;
    launch_url_in_ie( get_url );
}

// todo: cannot send script to see bucket, has and persand
// how to escape, or use non batch file
//
// todo: generate script files ( contents far below )
// write them to some temp location
// can we run them from the firefox resource directory?
function on_set_ie()
{
    var set_url = document.getElementById('url-set-exp-url').value;
    launch_url_in_ie( set_url );
}
function on_get_chrome()
{
    var get_url = document.getElementById('url-get-exp-url').value;
}
function on_set_chrome()
{
    var set_url = document.getElementById('url-set-exp-url').value;
}



function on_url_demo_0()
{
    try
    {
        var a = document.getElementById('expertContentHeading');

        alert( 'a:' + a );
    }
    catch(e)
    {
        alert('on all demo 1:\n' + e);
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
        dump('**exception** get cookies pref url:\n' + e + '\n');
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
function extract_linfo_from_p1( p1_cookie )
{
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

    var items = null;
    if( "undefined" != typeof( result.linfo ) && null != result.linfo )
    {
        items = result.linfo.split('|');
    }


    return items;
}

function on_url_demo_1()
{
    try
    {
//         var b = document.getElementById('exceptionDialogButton');

//         alert( 'b:' + b );

        var url = 'http://www.expedia.com';

        var cookies = get_cookies( url );

        var p1_chunks = extract_linfo_from_p1( cookies.p1 );

        var gacct = p1_chunks[0];

        var lang_id = p1_chunks[13];
        var exp_forced = p1_chunks[19];
        var exp_buket  = p1_chunks[21];


        var bucket_stuff = cookies['p1'];
        var guid_stuff = cookies['MC1'];

    }
    catch(e)
    {
        alert('on all demo 2:\n' + e);
    }
}

/*

show it is possible to click to accept security item.

*/
function on_url_demo_2()
{
    try
    {
        var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");


        // from the prefs dialog, how to access the tab content.
        allLinks = window.content.document.getElementsByTagName("div"),
        alert( 'link count: ' + allLinks.length );


        var currBrowser = currentWindow.getBrowser();
        var currURL = currBrowser.currentURI.spec;

        var src = currBrowser.src

        var tab = currentWindow.mCurrentTab;

//         alert( 'url = ' + currURL + '\n' +
//                 'tab = ' + tab );
//         alert( 'src = ' + src );

        // currentWindow.setTabTitle('goober');

        // var docURIObject = currentWindow.browser.contentDocument.documentURIObject;
        var contentDoc = currBrowser.contentDocument;
        var docURIObject = currBrowser.contentDocument.documentURIObject;

        alert('doc uri object:' + docURIObject);

        alert( 'inner html:' + contentDoc.body.innerHTML );

    }
    catch(e)
    {
        alert('trying window stuff:\n' + e);
    }
}


function on_update_urls()
{
    try
    {
        var env_list = document.getElementById('url-env-dropdown');
        var env = env_list.value;
        var url = env_list.label;

        var pos_list = document.getElementById('url-pos-list');
        var pos = pos_list.value;

        if( env == null || url == null || pos == null)
            return;

        var exp_list = document.getElementById('url-exp-list');
        var exp_short_name = exp_list.value;

        var eb = InstaBucket.load_exp_pref_tla( exp_short_name );
        var experiment_id = eb.get_pos_id( pos );

        var set_bucket_url = 'set, env: ' + env + ", url:" + url;
        var get_bucket_url = 'get, pos: ' + pos;

        var set_edit = document.getElementById('url-set-exp-url');
        var get_edit = document.getElementById('url-get-exp-url');

        var url_set = prepare_set_url( pos, env, experiment_id );
        var url_get = prepare_get_url( pos, env, experiment_id );

        set_edit.value = url_set;
        get_edit.value = url_get;
    }
    catch(e)
    {
        alert('on update urls:\n' + e);
    }
}

function prepare_set_url( pos, env, id )
{
    var bucket = 0;
    var url_template = "http://{domain}/pub/agent.dll/qscr=fctl/abme={experiment_id}/abmv={bucket}";

    var pos_root = get_host_from_pos( pos );
    var domain = prepareUrlHost( pos_root, env );

    url = url_template;
    url = url.replace( '{domain}', domain );
    url = url.replace( '{experiment_id}', id );
    url = url.replace( '{bucket}', bucket );

    return url;
}

function prepare_get_url( pos, env, id )
{
    this.url_template = "https://{domain}/Pubspec/Scripts/setaborerrcode.asp?abme={experiment_id}&d=1";

    var pos_root = get_host_from_pos( pos );
    var domain = prepareUrlHost( pos_root, env );

    url = url_template;
    url = url.replace( '{domain}', domain );
    url = url.replace( '{experiment_id}', id );

    return url;
}

function prepareUrlHost(domain_root, environment_choice)
{
    try
    {
        var infoUrl;
        var message = "";

        var env_append = environment_choice;

        // special case for PPE
        if( null != env_append && env_append == "expediaweb.com" )
        {
            domain_root = domain_root.replace(/\./g,"");

            // vsc looks different on PPE
            if(domain_root.indexOf("sncf") > 0)
            {
                domain_root = domain_root.replace("expediavoyages", "agencevoyages");
            }
        }

        var host = domain_root;

        if( env_append.length > 0 )
        {
            host += "." + env_append;
        }

        return host;
    }
    catch(e)
    {
        alert("prepareUrlHost exception:\n" + e);
    }
}

function get_host_from_pos(pos)
{
    var default_pos = [
        { pos: 'US', domainRoot: 'www.expedia.com' },
        { pos: 'UK', domainRoot: 'www.expedia.co.uk' },
        { pos: 'CA', domainRoot: 'www.expedia.ca' },
        { pos: 'DE', domainRoot: 'www.expedia.de' },
        { pos: 'AU', domainRoot: 'www.expedia.com.au' },
        { pos: 'JP', domainRoot: 'www.expedia.co.jp' },

        { pos: 'IT', domainRoot: 'www.expedia.it' },
        { pos: 'ES', domainRoot: 'www.expedia.es' },
        { pos: 'NL', domainRoot: 'www.expedia.nl' },
        { pos: 'MX', domainRoot: 'www.expedia.com.mx' },
        { pos: 'FR', domainRoot: 'www.expedia.fr' },
        { pos: 'IN', domainRoot: 'www.expedia.co.in' },

        { pos: 'AT',domainRoot: 'www.expedia.at' },
        { pos: 'BE',domainRoot: 'www.expedia.be' },
        { pos: 'IE',domainRoot: 'www.expedia.ie' },
        { pos: 'NZ',domainRoot: 'www.expedia.co.nz' },
        { pos: 'VSC',domainRoot: 'expedia.voyages-sncf.com' },
        { pos: 'KR',domainRoot: 'www.expedia.co.kr' },

        { pos: 'SE',domainRoot: 'www.expedia.se' },
        { pos: 'NO',domainRoot: 'www.expedia.no' },
        { pos: 'DK',domainRoot: 'www.expedia.dk' },
        { pos: 'SG',domainRoot: 'www.expedia.com.sg' },
        { pos: 'MY',domainRoot: 'www.expedia.com.my' },
        { pos: 'TH',domainRoot: 'www.expedia.co.th' }
    ];

    var count = default_pos.length;

    for( var i = 0 ; i < count ; i ++)
    {
        var pos_obj = default_pos[i];
        if( pos_obj.pos == pos )
        {
            return pos_obj.domainRoot;
        }
    }

    return 'not found';

}


// 1. create these two files
// 2. put them in the right place
// 3. call them to set buckets in IE.

/*


open_single_ie8.bat


@echo
@echo open url in IE
@echo usage:
@echo         open_single_ie8.bat url
@echo

cscript C:\dev\js\open_ie8\single_url_in_ie.js %*
rem exit

rem pause

*/

/*
single_url_in_ie.js


var IE        = new ActiveXObject("InternetExplorer.Application");

if( WScript.Arguments.length > 0 && WScript.Arguments(0) != "" )
{
    url = WScript.Arguments(0);
}


// Define how the window should look
IE.left    = 0;
IE.top     = 0;
IE.height  = 720;
IE.width   = 1000;
IE.menubar = 1;
IE.toolbar = 1;
IE.visible = 1;

function dbgPrint(msg)
{
    WScript.Echo(msg);
}

function loadPage( url )
{
    IE.navigate2(url);

    IE.Visible = true;
    waitPage();
}

function waitPage() {
    dbgPrint("wait...")
    while(IE.Busy) {
        WScript.Sleep(500);
    }
    WScript.Sleep(500);
}

function findElement(doc, tag, attr, value) {
    var items = doc.body.getElementsByTagName(tag);
    for(var i=0; i<items.length; i++) {
        try {
            if(items[i].getAttribute(attr) == value) {
                return items[i];
            }
        } catch (e) {}
    }
    return null;
}

loadPage( url );


IE.document.body.focus();
*/


