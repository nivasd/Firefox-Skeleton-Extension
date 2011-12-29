var g_testing = false;
var g_tracing = false;

/*

- force experiment bucket
  - set linfo / p1 cookie
  - send URL for emain to set cookie

- show experiment info
  - monitor omniture traffic, parse out v17
  - parse html looking for omniture variables

- identify what page is active
  - pos based on omniture experiment ids
  - environment based on URL
  - page based on omniture

- select what experiments to show
  - associate experiments with a url
  - prioritize_experiments

************* how experiments are picked to show *******

--->>>> events: page load, tab change

checkTabContent - tab changed, page loads
observe - called when anything happens, omniture, tab,

update_prefs - called by observe, and checkTabContent

prioritize_experiments - called by update_prefs, arrange what is shown
    - figure out what page is active - via: url, html
    - start with experiment group preference
    - add in omniture stuff
    - add in HTML stuff

load_exp_pref_index - TLA saved, telling what experiments are shown



********************************

triggers:
  page load
  tab change
  preference change

  user request
  omniture traffic
    observeSiteCatalystRequests

containers:
  exps_list - array of experiments on display
  omniture_buckets - when omniture traffic happens, store buckets
  html_buckets - when a new page is loaded, or a tab is selected, store buckets

bucket_capture:
  lookup based on env & pos
  omniture based
        extract_omniture_values
  html based
  populated via triggers

experiments on display layout update:
    prioritize_experiments
    prioritize_add_html_experiments
    prioritize_add_omniture_experiments
    inject_mvc_if_needed
    set_exp_pref_index

bucket value on display updates
    update_buckets_abacus
    update_buckets_omniture


**********************************


experiment
    id;
    id_ca;
    id_uk;
    tla;
    bucket;
    changed;

InstaBucket
    prefs: null,
    expID1: "",
    expSymbol1: "",
    expID2: "",
    expSymbol2: "",

    watchExp - called by XUL when menu used

    refresh_buckets - check if anything changed, if so hit web url


    onMenuLoadWebPage
    parse_abacus_page

    on_open_small_menu - left click in status bar area
    on_open_full_menu - right click
    open_menu - helper to prepare and open menu
    startup - initialize everything



    stored as:
    - long list of tlas under:
        InstaBucket.experiment_tlas.tla_1
        InstaBucket.experiment_tlas.tla_2
        InstaBucket.experiment_tlas.tla_3
        ...

    - experiment details:  (  replace {tla}  )
        InstaBucket.experiment.{tla}.tla
        InstaBucket.experiment.{tla}.fullname
        InstaBucket.experiment.{tla}.pos.us_id
        InstaBucket.experiment.{tla}.pos.uk_id
        InstaBucket.experiment.{tla}.bucket_names.name1
        InstaBucket.experiment.{tla}.bucket_names.name2

    - actively shown tlas:
        InstaBucket.experiment_showing.tla_1
        InstaBucket.experiment_showing.tla_2
        InstaBucket.experiment_showing.tla_3

todo:
  right click on cell, 'custom display'
    - enter an experiment ID to place here
    - not show experiment
    - change what group is showing
    - always show experiment
  support url generation for any experiment
  turn off event stuff when dialog open.
  why does pref dialog use different instance of insta bucket
  get some default groups
  have tab show items related to the page
    why is infosite showing search page experiments
  turn on auto update of extension
  change menu text from 'Get Url' to 'Show Url to set bucket'
  add button to popup dialog to
    copy to clipboard.
    send command to ie, chrome
  add FAQ section on wiki page
  - why do my expriments not show up?
  - how can I force them to appear?

  make it very easy to
  - add an experiment to the toolbar
  - type in an ID and have it start showing
  - hide an experiment per user request that is expired or not wanted
  - make an experiment a favorite.

  find experiment based on ID
  - sort in descending order by id / date

  remove multiple tla experiments with the same ID
  keep tla that is first in the alphabet
  keep tla that is entered by the user
  keep tla that is in a group
  keep tla that has the most loc

  html parse isn't working
  - navigate to UK hotel search
    - html bucket check causes experiments to show in the toolbar
    - need to have ability to see the experiment
    - separate to grab the bucket value
    - leon_uk has four experiments, not showing in omniture
    - code fails to get the bucket value
    - code only shows experiments when I ask for bucket values.


  experiment parsing:
  - sometimes US comes at first, check for capitals
  id: 538, 385
  - when I open preferences, load that experiment in the edit pane.

  dk hotel search
  - experiments show up in omniture or html
  - make it easy to bucket them on current point of sale
  - if multiple pos, then help them pick which id, showing original abacus names.

// to clean out everything:
pref = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch('InstaBucket' );

pref.deleteBranch('');

*/

function print( msg )
{
    dump( msg + '\n' );
}

function disable_pref_monitoring( duration )
{
    g_disable_preference_viewing = true;
    var d = new Date();
    if( !duration || duration < 10000 )
    {
        duration = 10000;
    }
    g_time_to_wait_for = d.getTime() + duration;
}

// this is a hack, to compensate for not disconnecting from event messaging.
// a better approach is to turn off the service listening.  but wasn't able to get
// that working.
function check_if_monitoring_disabled()
{
    if( !g_disable_preference_viewing )
    {
        return false;
    }

    var d = new Date();
    var current = d.getTime();

    var remaining = g_time_to_wait_for - current;

    if( remaining < 0 )
    {
        dump('\n\n\n\n\n\n\n\n\n\n\n');
        dump(' *** wait for load action ::\n' );
        dump(' *** enough time has passed, enable config monitoring again\n' );
        dump('\n\n\n\n\n\n\n\n\n\n\n');

        g_disable_preference_viewing = false;
        return false;
    }

//     dump('waiting, time remaining: ' + remaining );
    return true;
}

// after restarting firefox, set to disabled.
// this was important back when things were not stable
// today we use html and omniture stuff, so don't disable.
var g_disabled = false;

var g_disable_preference_viewing = false;
var g_time_to_wait_for = 0;

var g_show_first_only = 1;

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Ce = Components.Exception;

function experiment()
{
    this.id;
    this.bucket;
    this.description;
}

// store the 20 most recent experiments under view.
// input: experiment ID
// or input: experiment TLA
//
// ------- Logic:
// input received as ID or TLA
// ID is converted to TLA
// TLA is pushed on top
// trim stake
//   - remove duplicates
//   - reduce count to 20
//
//
// todo: remove this, replaced by bucket_capture.js
//
//
var recent_experiments =
{
    stack : new Array(),
    // todo: separate by point of sale / id
    buckets : new Array(),

    add_id : function( experiment_id, bucket )
    {
        var tla = this.lookup_tla_from_id( experiment_id );
        this.add_tla( tla, bucket );
        this.buckets[ experiment_id ] = bucket;
    },

    add_tla : function( experiment_tla, bucket )
    {
        // push places the item on the end,
        // we want the opposite, place at the start.
        // this.stack.push( experiment_tla );
        this.stack.unshift( experiment_tla );

        this.buckets[ experiment_tla ] = bucket;

//         dump('push tla: ' + experiment_tla + ' stack = ' + this.stack + '\n' );
        this.remove_dups();
        this.trim_to_length( 20 );

//         this.show_contents();
    },

    lookup_bucket : function( key )
    {
        var bucket = this.buckets[ key ];
        return bucket;
    },

    remove_dups : function()
    {
        var cleaned_stack = new Array();

        var tla_hash = new Array();
        for( var i = 0 ; i < this.stack.length ; i ++)
        {
            var tla = this.stack[i];
            if( tla_hash[ tla ] > 0 )
            {
                continue;
            }
            tla_hash[ tla ] = 1;
            // will this change the order?
            cleaned_stack.push( tla );
        }

        this.stack = cleaned_stack;
    },

    trim_to_length : function( max_length )
    {
        while( this.stack.length > max_length )
        {
            this.stack.shift();
        }
    },

    get_tlas : function()
    {
        var stack_copy = new Array();

        for(var i = 0 ; i < this.stack.length ; i ++)
        {
            stack_copy.push( this.stack[i] );
        }
        return stack_copy;
    },

    // some experiments will not return an id
    // we store the experiments by name
    // and the ids to return are
    // based on the point of sale.
    get_ids : function()
    {
        var ids = new Array();

        for(var i = 0 ; i < this.stack.length ; i ++)
        {
            var tla = this.stack[i];
            var pos = InstaBucket.get_pos(); // assume the current pos is ok.
            if( !pos )
            {
                dump('********** no pos found, default to US ***********\n');
                pos = 'US';
            }
            var id = this.lookup_id_from_tla( tla, pos );
            if( id > 0 )
            {
                ids.push( id );
            }
        }
        return ids;
    },

    lookup_tla_from_id : function( experiment_id )
    {
        var tla = '';
        try
        {
            if( !experiment_id )
            {
                return;
            }

            var expr = InstaBucket.find_exp_with_id( experiment_id );
//             dump('looking for tla from ID, id = ' + experiment_id + '\n');

            if( !expr )
            {
                dump('cannot find experiment with id:' + experiment_id + '\n');
                return '';
            }

//             expr.dump();
            tla = expr.tla;
        }
        catch(e)
        {
            dump('lookup tla from id:\n' + e + '\n');
        }
        return tla;
    },

    lookup_id_from_tla : function( experiment_tla, pos )
    {
        if( !pos )
        {
            pos = InstaBucket.get_pos(); // assume the current pos is ok.
        }
        var id = -1;
        try
        {
            var expr = InstaBucket.load_exp_pref_tla( experiment_tla );
            if( null != expr )
            {
                dump('jfkdls loaded tla: ' + experiment_tla + ' exp loaded: ' + expr + '  id:' + expr.full_name + '\n' );
                id  = expr.get_pos_id( pos );
            }
        }
        catch(e)
        {
            dump('lookup id from tla:\n' + e + '\n' );
        }
        return id;
    },

    show_contents : function()
    {
        dump( 'recent experiments: ' );
        var delimiter = '';
        for(var i = 0 ; i < this.stack.length ; i ++)
        {
            dump( delimiter );
            dump( this.stack[i] );
            delimiter = ' ';
        }
        dump('\n');
    }
}

// when a page is first loaded it gives the omniture stuff
// if the user changes between tabs, the stuff is lost
// store the bucket info gathered from omniture.
// use the URL as a lookup
// just keep writing bucket info, don't worry about removing stuff.
//
// issue: what is the url used for lookup?
// issue: several env / domain are used at the same time
//        what happens when we change between tabs?
//
// todo: remove this, replaced by bucket_capture
//
//
var bucket_hash =
{
    last_url : '',

    url_exp_lookup : new Array(),

    get_urls : function()
    {
        var url_list = new Array();
        try
        {
            for(var url in this.url_exp_lookup)
            {
                url_list.push(url);
            }
        }
        catch(e)
        {
            dump('bucket hash:\n' + e);
        }
        return url_list;
    },

    // given a url, return the root
    // enough to identify the environment and point of sale.
    // this way when a get is done, if no match on url
    // we can revert back to the root url.
    clean_url : function( url )
    {
        // keep everything in domain
        // http://hello.world.there/other?stuff
        // returns: http://hello.world.there
        // grab everything until a period is found
        // then grab everything else
        // until a question mark or slash is found

        var result = url;

        var is_file_regex = /\.html?/i;
        var is_file_found = is_file_regex.exec( url );

        if( !is_file_found )
        {
            var clean_regex = /^([^.]+[^?\/\\]*)/;
            var clean_result = clean_regex.exec( url );

            if( clean_result )
            {
                result = clean_result[1];
            }
        }

        return result;
    },

    reset_exp_hash : function( url )
    {
        var value_hash = new Array();
        this.url_exp_lookup[ url ] = value_hash;
        return value_hash;
    },

    get_exp_hash : function( url )
    {
//         dump('bucket hash : get experiments for url:\n    ' + url + '\n');
        if( !this.url_exp_lookup[url] )
        {
            this.reset_exp_hash( url );
        }
        return this.url_exp_lookup[url];
    },

    // set the experiment value for the url passed in
    // also set it for the root / clean url.
    set_omniture_exp_value : function( url, id, bucket )
    {
        try
        {
            var clean_url = bucket_hash.clean_url( url );

            this.last_url = clean_url;

            var values_hash = this.get_exp_hash( clean_url );

            values_hash[ id ] = bucket;
        }
        catch(e)
        {
            dump('set exp value:\n' + e + '\n');
        }
    },

    get_exp_value : function( url, oname )
    {
        var ovalue = null;
        try
        {
            var values_hash = this.url_exp_lookup[ url ];
            if( !values_hash )
            {
                var clean_url = bucket_hash.clean_url( url );
                values_hash = this.url_exp_lookup[ clean_url ];

                if( !values_hash )
                {
                    return null;
                }
            }
            ovalue = values_hash[ oname ];
        }
        catch(e)
        {
            dump('get omniture value:\n' + e);
        }
        return ovalue;
    }
}

// global singleton
//
// todo: move functionality to bucket_capture.js
//
var active_page_abacus =
{
    latest_url : '',
    experiments : new Array(),

    // todo: have a guy that stores the values, lookup all based on url
    omniture_values : new Array(),

    url_omniture_hash : new Array(),

    get_omniture_hash : function( url )
    {
//         dump( 'get omniture hash from url:\n' + url + '\n' );
        if( ! this.url_omniture_hash[ url ] )
        {
            this.reset_omniture_values( url );
        }
        return this.url_omniture_hash[ url ];
    },

    reset_omniture_values : function( url )
    {
        this.url_omniture_hash[ url ] = new Array();
    },

    // todo: does "this" work in place of "active_page_abacus" ?
    set_omniture_value : function( url, oname, ovalue )
    {
        try
        {
            this.latest_url = url;
            var values_hash = this.get_omniture_hash( url );

            values_hash[ oname ] = ovalue;
        }
        catch(e)
        {
            dump('set omniture value:\n' + e + '\n');
        }
    },

    get_omniture_value : function( url, oname )
    {
        var ovalue = null;
        try
        {
            var values_hash = this.get_omniture_hash( url );
            if( !values_hash )
            {
                return null;
            }
            ovalue = values_hash[ oname ];
        }
        catch(e)
        {
            dump('get omniture value:\n' + e);
        }
        return ovalue;
    },

    found_experiments : function()
    {
        if( this.experiments.length > 0 )
        {
            return true;
        }
        dump('active page abacus: experiments: ' + this.experiments);
        return false;
    },

    // todo: add  constructor
//    dump('enter active page abacus\n');

//     get_experiments: function()

    add: function( id, bucket, description )
    {
        if( !this.experiments )
        {
            dump('error: adding experiment before creating the array.');
            this.experiments = new Array();
        }
        this.experiments[id] = new experiment();
        this.experiments[id].id = id;
        this.experiments[id].bucket = bucket;
        this.experiments[id].description = description;
    },

    get_bucket: function( id )
    {
        // todo: remove this if not used.
//         dump('*\n*\n*\n*\n*\nyes, get bucket was called*\n*\n*\n*\n*\n');
        var ex = this.experiments[id];
        if( ex )
        {
            return ex.bucket;
        }

        return -1;
    },

    // gather_abacus: function( html )
    //
    // todo: move to bucket_capture.js
    //
    parse_html_for_experiments: function( html )
    {
        dump('>>>>>>>>  parse_html_for_experiments\n');

        try
        {
            this.experiments = new Array();
            // use regular expressions to pull out all mention of experiments
            // would be nice to identify which are associated with the active POS
            // Infosite:
            //              PLSetABTestIDAndValue('1044.1');
            // Search Results:
            //              setABIdAndValue("1158","1");
            //
            // common: setab...andvalue(


            // todo: do we see this when hitting the site via IP ( on jump box ) ?
            // <title>Alfonso V Hotel, hoteller i Leon, León, Spania | Expedia.no</title>
            // var pos_regex = /<title>[^|^<]+\|([^<]+)</g;
            // var pos_regex = /(....title.............)/g;
            // var pos_regex = /(title=.*?expedia.*?")/g;
//             var pos_regex = /(......expedia......)/g;
//             var pos_match = null; // pos_regex.exec( html );

//             // todo: find something that pulls the pos out of the html
//             var pos_found = '';
//             while( false && null != pos_match )
//             {
//                 pos_found = pos_match[1];
//                 dump('found pos: ' + pos_found + '\n');
//                 pos_match = pos_regex.exec( html );
//             }

            // this works for infosite, changing to support search results also
            // var exp_regex = /PLSetABTestIDAndValue.*?(\d+)\.(\d+)/g;

            var exp_regex = /setab.*?idandvalue.*?(\d+)[.,'" ].*?(\d+)../gi;
            var exp_match = exp_regex.exec( html );

            var exp_count = 0;
//             var show = '';

            while( null != exp_match )
            {
                var id = exp_match[1];
                var bucket = exp_match[2];
                var description = '';

                dump('parse_html: ' + id + ':' + bucket + ' in: ' + exp_match[0] + '\n');

//                 dump('found exp: ' + id + ' bucket: ' + bucket + '\n');
//                 show += 'found exp: ' + id + ' bucket: ' + bucket + '\n';

                exp_count++;

                this.add( id, bucket, description );


                // use default key of pos and environment
                html_buckets.set_bucket(id, bucket);


                exp_match = exp_regex.exec( html );
            }

            // special case of bucket of MVC can be seen in html:  "<!-- rendered by MVC -->"
            // to keep it fast, just search the first 500 characters.

//             InstaBucket.inject_mvc_if_needed();

            dump('finished parsing html for experiments, count: ' + exp_count + '\n');
        }
        catch(e)
        {
            dump('**exception**\nparse_html_for_experiments:\n' + e + '\n');
        }
    },

    // the request image has loads of stuff
    // we intercept the url to parse out all sorts of goodies.
    // v34 = experiment ids and buckets
    // v17 = page name
    // experiment ids are used to:
    // - know what the curren point of sale is ( html in file, jump box by IP )
    // - know what bucket a page is on
    // page name is used to:
    // - know what experiments to show
    //   - when combined with the pos and env
    //
    // todo: move to bucket_capture.js
    //
    extract_omniture_values: function( url )
    {
        try
        {
            url = unescape( url );
            var page_url = InstaBucket.get_current_url();
            page_url = bucket_hash.clean_url( page_url );

//             dump('when navigating to url: \n ' + page_url +
//                 '\n\nan omniture image was requested:\n' +
//                 url + '\n\n');

            // g = global, iterate through all text
            var om_reg_ex = /[\\?&]([^=]+)=([^&#]*)/g;
            var om_match = null;
            while( om_match = om_reg_ex.exec( url ) )
            {
                var om_name = unescape( om_match[1] );
                var om_value = unescape( om_match[2] );
//                 dump('found omniture ' + om_match[1] + ' unescaped: ' + om_name + ' = ' +
//                     om_match[2] + '  unescaped: ' + om_value + '\n');
//                 dump(om_name + ' = ' + om_value + '\n');
                active_page_abacus.omniture_values[om_name] = om_value;
                active_page_abacus.set_omniture_value( page_url, om_name, om_value );
                var read_val = active_page_abacus.get_omniture_value( page_url, om_name );
//                 dump('matches? : ' + om_value + ' -- ' + read_val + '\n');

            }
//             dump('\n');

            var v34_read_val = active_page_abacus.get_omniture_value( page_url, 'v34' );
            dump( 'abacus v34 is: ' + v34_read_val + '\n' );

            var exps = active_page_abacus.extract_bucket_values( v34_read_val );

            // use the first experiment to know the POS
            // then add the normal abacus stuff.
            // then try injecting MVC

            // after receiving items from omniture, always check the pos.
//             if( !InstaBucket.get_pos() )
            if( true )
            {
                var pos_from_experiment = '';

                dump( 'determine the pos for url: ' + page_url + '\n' );
                for( var e in exps )
                {
                    var id = e;
                    var bucket = exps[e];
    //                     dump('store experiment ' + id + ' with bucket: ' + bucket + '\n');

                    dump('try to get pos from experiment id: ' + id + '\n' );
                    pos_from_experiment = active_page_abacus.get_pos_from_exp_id( id );

                    dump('got back pos: ' + pos_from_experiment + '\n' );
                    if( pos_from_experiment && pos_from_experiment.length > 1 )
                    {
                        InstaBucket.store_pos_for_url( page_url, pos_from_experiment );
    //                     InstaBucket.pos_url_lookup[ page_url ] = pos_from_experiment;
                        break;
                    }
                }

                if( !pos_from_experiment )
                {
                    dump('*\n*\n*\nfailed to get pos, default to  US\n\n' );
                    pos_from_experiment = 'US';
                }
            }

//             dump( 'store experiments under url:\n' + page_url + '\n' );
            for( var e in exps )
            {
                var id = e;
                var bucket = exps[e];
//                     dump('store experiment ' + id + ' with bucket: ' + bucket + '\n');

//                 bucket_hash.set_omniture_exp_value( page_url, id, bucket )

//                 InstaBucket.on_omniture_url_exp_bucket( id, bucket, page_url );

//                 dump('\ncalling set bucket on omniture buckets\n\n');
                // use default key of pos and environment
                omniture_buckets.set_bucket(id, bucket);
            }
//             InstaBucket.inject_mvc_if_needed();
        }
        catch(e)
        {
            dump( 'extract omniture values: ' + e + '\n' );
        }
    },

    get_pos_from_exp_id: function( exp_id )
    {
        var pos_match = '';

        try
        {
            // use id to determine the point of sale.
            // if the URL text fails to give pos, this is a fallback.
            var expr = InstaBucket.find_exp_with_id( exp_id );
            if( !expr )
            {
                dump('on omniture url exp bucket:  id: <' + id + '> gave null expr\n' );
                return '';
            }

//             dump('found experiment: ' + expr.dump() + '\n' );
            var pos_array = expr.get_pos_array();

            for( var i = 0 ; i < pos_array.length ; i++)
            {
                var e_pos = pos_array[i];
                var e_id = expr.get_pos_id( e_pos );

                dump('get pos from exp id : found id: ' + e_id + ' with pos: ' + e_pos + '\n' );

                if( e_id == exp_id )
                {
                    pos_match = e_pos;
                    dump( 'found pos: ' + e_pos + ' from exp id: ' + exp_id + '\n' );
                    break;
                }
            }
        }
        catch(e)
        {
            dump('get pos from exp id:\n' + e + '\n' );
        }
        return pos_match;
    },

    extract_bucket_values: function( v34_tag )
    {
        var result = new Array();
        try
        {
            // input: 1044.1|1062.0|1066.2|1078.2|1111.0|1167.0|1150.1
            // output hash of hash big to small.

            var items = v34_tag.split('|'); // split between experiments is PIPE
//            var items = v34_tag.split(/[|_]/);
            for(var i = 0 ; i < items.length ; i++)
            {
                var experiment_dot_bucket = items[i];
                // infosite uses dot, search results uses underscore, split on any non digit
                var ex_id_bucket = experiment_dot_bucket.split(/\D+/);
                var ex = ex_id_bucket[0];
                var bucket = ex_id_bucket[1];
                result[ex] = bucket;
            }

            dump('extract bucket values, input:' + v34_tag + '\n');
            dump('output: ');
            for( var i in result )
            {
                var b = result[i];
                dump( i + ' = ' + b + ', ' );
            }
            dump('\n');
        }
        catch(e)
        {
            dump('extract bucket values:\n' + e + '\n');
        }
        return result;
    },


    // copied from WATS firefox extension.
  /**
   * This function inspects all http requests, and checks
   * if these are site catalyst requests.
   */
    observeSiteCatalystRequests : function (aSubject, aTopic, aData)
    {
        try
        {
            if( !check_if_monitoring_disabled ) return;
            if( check_if_monitoring_disabled() ) return;

            aSubject.QueryInterface(Ci.nsIHttpChannel);
            var url = aSubject.URI.spec;

            // requests for pictures also show up here
            // keep only omniture image requests
            if( url.indexOf('om.expedia') < 0 )
            {
                return;
            }

            for( var i = 0 ; i < 20 ; i ++) dump('\n');
            dump('observe :: ' + aSubject + ' :: ' + aTopic + ' :: ' + aData + '\n');
            for( var i = 0 ; i < 20 ; i ++) dump('\n');

            var tab_url = '';
            if( window && window.content && window.content.document && window.content.document.URL )
            {
                tab_url = window.content.document.URL;

                InstaBucket.set_current_url( tab_url );
                ExpWebReader.set_domain( tab_url );
            }
            else
            {
                dump('   *** not able to get tab url, cannot save pos with url\n');
            }

            active_page_abacus.extract_omniture_values( url );

            // *************************************
            // *************************************
            // *************************************
            // *************************************
            // removed, also called by "observe", which calls observe site catalyse request
            // *************************************
            // *************************************
            // *************************************

            InstaBucket.update_prefs();
        }
        catch(e)
        {
            dump('***exception***\nobserveSiteCatalystRequests:\n' + e + '\n' );
        }
    },


    // todo: move code to different object
            // this approach is independent of the active window
            // todo: move to central "get current doc" ?
    get_page_inner_html: function( )
    {
        var inner_html = '';

        try
        {
            // todo: access classes, load once, or every time?
            var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                .getService(Components.interfaces.nsIWindowMediator)
                                .getMostRecentWindow("navigator:browser");
            var currBrowser = currentWindow.getBrowser();
            var contentDoc = currBrowser.contentDocument;
            if( contentDoc )
            {
                inner_html = contentDoc.body.innerHTML;
            }
        }
        catch(e)
        {
            dump('get page inner html exception : ' + e + '\n');
        }
        return inner_html;
    },

    discover_html_content: function( )
    {
        dump('enter discover_html_content\n');
        var found_some_experiments = false;
        try
        {
            var page_content = this.get_page_inner_html();

            if( page_content && page_content.length > 100 )
            {
                this.experiments = new Array();

                // todo: better to use 'this' or obj/class name 'active_page_abacus' ?
                this.parse_html_for_experiments( page_content );
            }
            found_some_experiments = this.found_experiments();
        }
        catch(e)
        {
            dump('**exception**\ndiscover_html_content:\n' + e + '\n');
        }
        dump( 'discover_html_content returning: ' + found_some_experiments + '\n' );
        return found_some_experiments;
    },

//    dump('exit active page abacus\n');
}

//
// todo: move to separate file
// todo: rename to  experiment or exp_wrapper
function exp_pref_bucket()
{
    this.tla;
    this.full_name;
    this.id_pos = new Array();
    this.id_pos_abacus = new Array();
    this.bucket_names = new Array();

    this.bucket;
    this.changed;

    this.set_pos_id = function( pos, id )
    {
        pos = pos.toUpperCase();

        if( typeof( id ) == "undefined" || id == null || id == '' )
        {
            delete this.id_pos[pos];
            return;
        }

        if( "undefined" == this.id_pos[pos] ||
            this.id_pos[pos] != id )
        {
//             if( g_tracing ) dump( 'setting item ' + pos + ' to: ' + id );
            this.id_pos[pos] = id;
            changed = true;
//             if( g_tracing ) dump( 'just set item ' + pos + ' to: ' + this.id_pos[pos] );
        }
        else
        {
            if( g_tracing ) dump( 'did not set item ' + pos + ' to: ' + id );
        }
    }

    this.get_pos_id = function( pos )
    {
        var result = -1;
        pos = pos.toUpperCase();
        if( "undefined" != typeof( this.id_pos[pos] ) )
        {
            result = this.id_pos[pos];
        }
        return result;
    }

    this.get_pos_array = function ()
    {
        var pos_array = new Array();
        for( var pos in this.id_pos )
        {
            pos_array.push( pos );
        }
        pos_array = pos_array.sort();

        return pos_array;
    }

    this.set_pos_abacus_details = function( pos, detail )
    {
        try
        {
            pos = pos.toUpperCase();

            this.id_pos_abacus[pos] = detail;
        }
        catch(e)
        {
        }
    }

    this.get_pos_abacus_details = function( pos )
    {
        var details = '';
        try
        {
            pos = pos.toUpperCase();

            if( "undefined" != this.id_pos_abacus[pos] )
            {
                details = this.id_pos_abacus[pos];
            }
        }
        catch(e)
        {
        }
        return details;
    }

    this.get_pos_count = function()
    {
        var count = 0;
        for( var i in this.id_pos )
        {
            count++;
        }
        return count;
    }

    this.get_abacus_details = function()
    {
//         alert(' grabbing abacus details' );
        var composite_details = '';
        var divider = '';
        for( var pos in this.id_pos_abacus )
        {
//             alert('adding:' + this.get_pos_abacus_details( pos ) );
            composite_details += divider;
            composite_details += this.get_pos_abacus_details( pos );
            divider = '\n';
        }
        return composite_details;
    }

    this.set_bucket_name = function( index, name )
    {
//         if( g_testing ) dump( "setting bucket " + index + " to: " + name );
        if( "undefined" == typeof( name ) || null == name )
        {
            delete this.bucket_names[ index ];
            return;
        }
        this.bucket_names[ index ] = name;
//         if( g_testing ) dump( "just set bucket " + index + " to: " + this.bucket_names[index] );
    }

    this.get_bucket_name = function( index )
    {
        var bn = this.bucket_names[ index ];
        if( "undefined" == typeof( bn ) )
            bn = "";
        return bn;
    }

    this.set_tla = function( tla )
    {
        if( this.tla == tla )
            return;
        this.tla = tla;
        this.changed = 1;
    }
    this.set_bucket = function( bucket )
    {
        if( this.bucket == bucket )
            return;
        this.bucket = bucket;
        this.changed = 1;
    }

    this.set_changed = function( changed )
    {
        this.changed = changed;
    }

    this.equals = function( exp_other )
    {
        try
        {
            if( exp_other == null ||
                "undefined" == typeof(exp_other) )
                return false;
            if( this.tla != exp_other.tla )
                return false;
            if( this.full_name != exp_other.full_name )
                return false;
            if( this.id_pos.length != exp_other.id_pos.length )
                return false;
            for( var i in this.id_pos )
            {
                if( this.id_pos[i] != exp_other.id_pos[i] )
                    return false;
            }
            if( this.bucket_names.length != exp_other.bucket_names.length )
                return false;
            for( var i in this.bucket_names )
            {
                if( this.bucket_names[i] != exp_other.bucket_names[i] )
                    return false;
            }
        }
        catch(e)
        {
            alert('exception comparing two experiments:\n' + e);
            return false;
        }
        return true;
    }

    this.dump = function( option )
    {
        var result = 'experiment dump: \n';
        if( option ) dump( 'experiment dump: \n' );
        result += '\ntla   = ' + this.tla;
        if( option ) dump( '\ntla = ' + this.tla );
        result += '\nfull   = ' + this.full_name;
        if( option ) dump( '\nfull   = ' + this.full_name );

        for( var i in this.id_pos )
        {
            result += '\npos ' + i + ' has id:' + this.id_pos[i];
            if( option ) dump('\npos ' + i + ' has id:' + this.id_pos[i]);
        }
        for( var b in this.bucket_names )
        {
            result += '\nbucket ' + b + ' = ' + this.bucket_names[b];
            if( option ) dump('\nbucket ' + b + ' = ' + this.bucket_names[b]);
        }
        result += '\nbucket= ' + this.bucket;
        if(option) dump('\nbucket= ' + this.bucket);
        result += '\nchanged=' + this.changed;
        if(option) dump('\nchanged=' + this.changed);
        result += '\nabacus details=' + this.get_abacus_details();
        if(option) dump('\nabacus details=' + this.get_abacus_details());

        return result;
    }
}

var InstaBucket =
{
    prefs: null,
//    tab_change: false,
    last_url: '',
    last_pos: '',
    haveShownSomething: false,
    exps_list: new Array(),     // the six active experiments

    status_bar_index_selcted: -1,
    g_options_window: null,

    exp_id_lookup: new Array(),
    exp_list_cache: new Array(),

    have_omniture_tags_to_show: false,
    // recent_experiments is not a constructor
//     omniture_stack: new recent_experiments(),
    omniture_stack: recent_experiments,

    get_char_pref_test: function( pref_name )
    {
        var step = 'a';
        try
        {
            dump('  >>> enter >>> get_char_pref\n' );

            if( false )
            {
                if( this.prefs.prefHasUserValue( pref_name ) )
                {
                    var value = this.prefs.getCharPref( pref_name );
                    dump('  get_char_pref : retuning normal pref for: ' + pref_name + '  value: ' + value + '\n' );
                    return value;
                }
            }
            step = 'b';
            // from pref name, slice off the char pref name
            // and prepend 'InstaBucket.
            //
            // path.to.save.name.here.charPrefName

            var get_branch_regex = /(.*)\.(.*)$/;
            var get_branch_result = get_branch_regex.exec( pref_name );

            if( !get_branch_result )
            {
                dump('**failure** get_char_pref cannot get pref name from: ' + pref_name + '\n' );
                return null;
            }
            step = 'c';

            var defBranchName = 'InstaBucket.' + get_branch_result[1];
            var defSaveName = get_branch_result[2];

            dump( 'get_char_pref - branch: ' + defBranchName + '  value: ' + defSaveName + '\n' );
            step = 'd';

            pref_default = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
            .getBranch(defBranchName); // default branch is always included.
            step = 'e';

            if( !pref_default.prefHasUserValue( defSaveName ) )
            {
                dump( '  get_char_pref : fail, no value in defaults for ' + defSaveName + '\n' );
//                 return null;
            }
            step = 'f';

            var defautValue = pref_default.getCharPref( defSaveName );
            step = 'g';

            dump('  get_char_pref : retuning default pref for: ' + defSaveName + '  value: ' + defautValue + '\n' );
        }
        catch(e)
        {
//             e = unescape( e );
//             dump('**exception** get char pref:\n' + e);
            dump('**exception** get char pref, step: ' + step + '\n');
        }
    },

    // env represents the environment, the lab, live or desktop choice
    // todo: store the last good env
    // todo: calculate the env based on
    // url / filename / experiment / omniture
    get_env: function()
    {
        var env = '';

        try
        {
            env = ExpWebReader.url_environment;
            if( env && env.length > 0 )
            {
                return env;
            }
            else
            {
                // if the URL ends in .htm or .html then this is a file
                // when testing I use html files
                var cur_url = InstaBucket.get_current_url( );
                var is_url_file_regex = /\.htm[l]?$/i;
                var is_url_file_found = is_url_file_regex.exec( cur_url );

                if( is_url_file_found )
                {
                    env = 'file';
                }
                else
                {
                    env = 'live';
                }
            }
        }
        catch(e)
        {
            dump('using default env of xyz\n');
            env = 'xyz';
        }
        return env;
    },

    get_page_name: function()
    {
        var page_name = '';
        var url = '';
        try
        {
            var cur_url = InstaBucket.get_current_url( );
            var page_url = bucket_hash.clean_url( cur_url );
            url = page_url;
            var om_tag = 'v17';
            page_name = active_page_abacus.get_omniture_value( page_url, om_tag );
        }
        catch(e)
        {
            dump(' **exception** get page name:\n' + e + '\n');
        }
//         dump( '*\n*\n*\nfor url: ' + url + ' get page name returning: ' + page_name + '\n' );
        return page_name;
    },

    pos_url_lookup: Array(),

    store_pos_for_url: function( url, pos )
    {
        try
        {
            if( url )
            {
//                 dump('store pos<' + pos + '> for url: ' + url + '\n');
                this.pos_url_lookup[ url ] = pos;
            }
        }
        catch(e)
        {
            dump('**exception**\nstore pos for url:\n' + e + '\n' );
        }
    },

    get_pos: function( url )
    {
        var pos = null;
        try
        {
            if( url && url.length > 0 )
            {
                url = bucket_hash.clean_url( url );
                pos = this.pos_url_lookup[ url ];

                if( !pos )
                {
    //                 dump('could not find pos in url lookup with: ' + url + '\n' );
                    dump(' -no pos lookup-: url:' + url + '-no pos lookup-\n' );
                }
            }
            if( !pos )
            {
                pos = ExpWebReader.pos;
            }
            if( pos && pos.length > 0 )
            {
                InstaBucket.store_pos_for_url( url, pos );
                return pos;
            }
            else
            {
                if( !url || url.length < 0 )
                {
                    // try again with current url
                    url = InstaBucket.get_current_url();
                    if( url && url.length > 0 )
                    {
                        // danger: recursion, possible infinite loop
                        return InstaBucket.get_pos( url );
                    }
                }
                dump(' -last pos:: <' + this.last_pos + '> last pos- url:<' + url + '>\n');
    //             dump('exp web reader pos was not valid, returning last pos: <' + this.last_pos + '>\n');
                pos = this.last_pos;
            }
            this.last_pos = pos;
        }
        catch(e)
        {
            dump('**exception**\nget pos:\n' + e + '\n' );
        }
        return pos;
    },

    on_open_small_menu: function(status_bar_index)
    {
        try
        {
            var node_id = 'insta-bucket-' + status_bar_index;
            var menu_id_small = 'bucket-context-menu';
            var menu_id_full = 'full-feature-context-menu';

            var showing_full_menu = document.getElementById( menu_id_full ).
                state == "open";

            this.status_bar_index_selcted = status_bar_index;

            // this is null.
            // var nodeId = document.popupNode.id;
            // alert('index: ' + this.status_bar_index_selcted + ' node id: ' + nodeId );

            this.set_active_status_bar_item( this.status_bar_index_selcted );

            // full menu takes precedence over small menu.
            if( !showing_full_menu )
                this.open_menu( status_bar_index, node_id, menu_id_small );
        }
        catch(e)
        {
            alert('on open small menu:' + e );
        }
    },

    on_open_full_menu: function(status_bar_index)
    {
        try
        {
            var node_id = 'insta-bucket-' + status_bar_index;
            var menu_id_small = 'bucket-context-menu';
            var menu_id_full = 'full-feature-context-menu';

            var showing_small_menu = document.getElementById( menu_id_small ).
                state == "open";

            this.status_bar_index_selcted = status_bar_index;
            this.set_active_status_bar_item( this.status_bar_index_selcted );

            // full menu takes precedence over small menu.
    //        if( showing_small_menu )
    //        {
                document.getElementById( menu_id_small ).hidePopup();
    //        }

            this.open_menu( status_bar_index, node_id, menu_id_full );
        }
        catch(e)
        {
            alert('on open full menu:' + e);
        }
    },

    open_menu: function( status_bar_index, status_bar_node_id, menu_id )
    {
        try
        {
            // *** hack alert ***
            // normally we read popupNode when the context menu is opened
            // however, here we are manually opening the context menu.

            // let's try setting this, to simulate what happens when
            // xul item is set:     context="bucket-context-menu"
            //
            // maybe we're not calling "openPopup" correctly.

            var status_bar_node = document.getElementById(status_bar_node_id);

            document.popupNode = status_bar_node;

            var exp_pref = null;
            if( this.exps_list.length > status_bar_index )
            {
                exp_pref = this.exps_list[ status_bar_index ];
            }
            else
            {
                // load from prefs won't get the current bucket.
                var exp_tla = this.load_exp_pref_index( status_bar_index );
                var exp_pref = InstaBucket.load_exp_pref_tla( exp_tla );
                if( null != exp_pref )
                {
                    dump('icuxyzty loaded tla: ' + exp_tla + ' exp loaded: ' + exp_pref + '  id:' + exp_pref.full_name + '\n' );
                }
            }

//             alert("id = " + id + " tla = " + exp_tla );

            if( null != exp_pref && "undefined" != typeof( exp_pref ) )
            {
                var bucket = exp_pref.bucket;
//                 alert('bucket = ' + bucket );

// todo: check the menu item, put a dot by the current bucket.

//                 document.getElementById('set-bucket-popup').selectedIndex = bucket;
//                 document.getElementById('set-bucket-menulist').selectedIndex = bucket;

                for(var i = 0 ; i < 4 ; i ++)
                {
                    var menu_id_full = "full-set-bucket-" + i;
                    var menu_id_context = "context-set-bucket-" + i;

                    var label = exp_pref.get_bucket_name(i);

                    // bug: getting false hits.
                    // sometimes this is set, when the experiment is not applied to the pos
                    if( i == bucket )
                    {
                        label = " >>> " + label;
                    }

                    document.getElementById(menu_id_full).label = label;
                    document.getElementById(menu_id_context).label = label;
                }

                var reload_on = InstaBucket.get_is_reloading_on_bucket_change();
                document.getElementById('full-set-refresh-after').checked = reload_on;
                // remove refresh check box from context menu
//                 document.getElementById('context-set-refresh-after').checked = reload_on;
            }
            else
            {
                try
                {
                    // todo: find a better way.
                    document.getElementById("full-set-bucket-0").label = 'bucket 0';
                    document.getElementById("context-set-bucket-0").label = 'bucket 0';
                    document.getElementById("full-set-bucket-1").label = 'bucket 1';
                    document.getElementById("context-set-bucket-1").label = 'bucket 1';
                    document.getElementById("full-set-bucket-2").label = 'bucket 3';
                    document.getElementById("context-set-bucket-2").label = 'bucket 2';
                    document.getElementById("full-set-bucket-3").label = 'bucket 3';
                    document.getElementById("context-set-bucket-3").label = 'bucket 3';
                }
                catch(e) { }
            }

            var menuz = document.getElementById( menu_id );

            // var position = "end_before";
            var position = "after_start";
            menuz.openPopup( status_bar_node, position, 0, 0, true, false);
        }
        catch(e)
        {
            alert('open context menu:\n' + e);
        }
    },

    // Initialize the extension

    startup: function()
    {
        try
        {
//            alert("enter insta bucket");
            // Register to receive notifications of preference changes

            if( g_testing ) dump( 'startup\n' );


            connect_event_listeners( );

                // dom content loaded called a bit earlier than load

                // load is called when the page has finished loading.

//            var statusBar = document.getElementById('status-bar');
//            statusBar.addEventListener("contextmenu", this.open_popup, true);

//             var panel0 = document.getElementById('insta-bucket-0');
//             panel0.addEventListener("contextmenu", this.open_popup, true);

//             this.prioritize_experiments();
        }
        catch(e)
        {
            dump( 'exceptin with startup:\n' + e + '\n' );
            alert( "exceptin with startup:\n" + e );
        }
    },

    // Clean up after ourselves and save the prefs

    shutdown: function()
    {
        this.prefs.removeObserver("", this);
        statusBar.removeEventListener("contextmenu");
    },

    set_exp_pref_index: function( status_bar_index, tla )
    {
        try
        {
            var save_name_full = 'experiment' + status_bar_index + '.tla';

            this.prefs.setCharPref(save_name_full, tla );
        }
        catch(e)
        {
            dump('**exception** set exp pref index:\n' + e + '\n');
        }
    },

    delete_exp_pref: function( pref_tla )
    {
        var save_tla_sn = 'experiment.' + 'experiment_tlas.' + pref_tla;

        if( this.prefs.prefHasUserValue( save_tla_sn ) )
            this.prefs.clearUserPref( save_tla_sn )

            // todo delete the orphaned exp.
    },

    delete_all_prefs: function()
    {
        var all_exp_sn = '';
//         var all_exp_sn = 'experiment';
//         var all_exp_sn = 'InstaBucket.experiment';
//         var all_exp_sn = 'InstaBucket.experiment.experiment_tlas';

        this.prefs.deleteBranch( all_exp_sn )
    },

    add_quick_set_id: function( id, pos )
    {
        try
        {
// //         var nodeId = document.popupNode.id;
//         var nodeId = InstaBucket.get_active_status_bar_item();
//         var id_len = nodeId.length;
//         var status_bar_index = nodeId.substr( id_len-1 );

            // var status_bar_index = this.set_active_status_bar_item_from_popup_node_id();
            var status_bar_index = this.get_active_status_bar_item();

        var ex = null;

        ex = InstaBucket.find_exp_with_id( id );

        if( null == ex )
        {
            ex = new exp_pref_bucket();
            ex.tla = id;
            ex.full_name = id + ' quick entered';
            ex.set_pos_id(pos, id);

            ex.set_bucket_name(0, 'control');
            ex.set_bucket_name(1, 'on');
            this.save_exp_pref( ex );
        }
        else
        {
            ex.tla = id + ' (' + ex.tla + ')';
            this.save_exp_pref( ex );
        }

        this.set_exp_pref_index( status_bar_index, ex.tla );
        this.prioritize_experiments(true);
        this.refresh_buckets();
        }
        catch(e)
        {
            dump('add_quick_set_id:\n' + e + '\n');
        }
    },

    save_exp_pref: function( pref_experiment )
    {
        try
        {
            var save_tla_root;
            try
            {
                save_tla_root = 'experiment.' + 'experiment_tlas.';
                this.prefs.setCharPref( save_tla_root + pref_experiment.tla, pref_experiment.tla );
            }
            catch(e)
            {
                return;
            }

            var sn_root = 'experiment.' + pref_experiment.tla;
            // InstaBucket.experiment.{tla}.tla

            if( g_testing ) dump('saving: ' + pref_experiment.tla );
            if( g_testing ) dump('to: ' + sn_root + '.tla' );

            this.prefs.setCharPref(sn_root + '.tla', pref_experiment.tla );
            this.prefs.setCharPref(sn_root + '.fullname', pref_experiment.full_name );

            var pos_root = sn_root + '.pos'
            this.prefs.deleteBranch( pos_root );

            // InstaBucket.experiment.{tla}.pos.uk_id

            for( var pos in pref_experiment.id_pos )
            {
                var id = pref_experiment.id_pos[ pos ];
                if( "undefined" == typeof( id ) || null == id || id.length < 1 )
                    continue;

                var save_name_id_pos = pos_root + '.' + pos + '_id';

                if( g_testing ) dump('saving pos: ' + pos + ' = ' + id );
                if( g_testing ) dump( save_name_id_pos );

                this.prefs.setCharPref(save_name_id_pos, id);

                var abacus = pref_experiment.get_pos_abacus_details( pos );
                var save_name_abacus = pos_root + '_abacus.' + pos;

                if( g_tracing ) dump(' saving abaucus info: ' + abacus );
                if( g_tracing ) dump(' saving abaucus info to: ' + save_name_abacus );
                if( "undefined" != typeof( abacus ) && null != abacus )
                    this.prefs.setCharPref(save_name_abacus, abacus);
            }

            var bucket_names_root = sn_root + '.bucket_names';
            this.prefs.deleteBranch( bucket_names_root );
            bucket_names_root += '.';

            for( var bucket_index in pref_experiment.bucket_names )
            {
                var save_name_bucket = bucket_names_root + 'name_' + bucket_index;
                var bucket_name = pref_experiment.bucket_names[ bucket_index ];
                this.prefs.setCharPref( save_name_bucket, bucket_name);
            }
        }
        catch(e)
        {
            alert('save exp pref:\n' + e);
        }
    },

    set_active_group_name: function( group_name )
    {
        var save_name = 'Grouping.Active.Choice';
        this.prefs.setCharPref( save_name, group_name );

        var names = InstaBucket.load_group_exp_tla_names( group_name );

        for( var i = 0 ; i < 20 ; i ++)
        {
            var n = names[i];
            if( "undefined" == typeof( n ) )
                n = '';
            InstaBucket.set_exp_pref_index( i, n );
        }
    },

    get_active_group_name: function( )
    {
        var group_name = '';
        var save_name = 'Grouping.Active.Choice';
        if( this.prefs.prefHasUserValue( save_name ) )
            group_name = this.prefs.getCharPref( save_name );

        return group_name;
    },

    get_all_group_names: function()
    {
        var names = new Array();
        try
        {
            if( null == this.prefs )
            {
                this.startup();
            }

            for( var i = 0 ; i < 40 ; i ++)
            {
                var save_name = 'Grouping' + i + '.name';
                if( this.prefs.prefHasUserValue( save_name ) )
                {
                    var g_name = this.prefs.getCharPref( save_name );
                    names.push( g_name );
                }
            }
        }
        catch(e)
        {
            alert(' get all group names:\n' + e);
        }
        return names;
    },

    delete_group_exp: function( group_name )
    {
        var active_group_index = -1;
        var next_available_index = -1;

        for( var i = 0 ; i < 40 ; i ++)
        {
            var save_name = 'Grouping' + i + '.name';
            if( this.prefs.prefHasUserValue( save_name ) )
            {
                var g_name = this.prefs.getCharPref( save_name );
                if( g_name == group_name )
                {
                    if( g_tracing ) dump( 'delete group found existing name at index:  ' + i );
                    active_group_index = i;
                    break;
                }
            }
            else
            {
                if( next_available_index < 0 )
                    next_available_index = i;
            }
        }

        if( g_tracing ) dump( 'delete group:  step a' );

        if( active_group_index < 0 )
        {
            active_group_index = next_available_index;
        }
        else
        {
            // wipe out whatever is there.

//             InstaBucket.clear_group_exp_tla_names( group_name );
            var save_name = 'Grouping' + active_group_index;
            this.prefs.deleteBranch( save_name )

            if( g_tracing ) dump( 'delete group:  cleared user prefs ok' );
        }
    },

    save_group_exp_tla_names: function( group_name, tla_names )
    {
        var active_group_index = -1;
        var next_available_index = -1;

        for( var i = 0 ; i < 40 ; i ++)
        {
            var save_name = 'Grouping' + i + '.name';
            if( this.prefs.prefHasUserValue( save_name ) )
            {
                var g_name = this.prefs.getCharPref( save_name );
                if( g_name == group_name )
                {
                    if( g_tracing ) dump( 'save group found existing name at index:  ' + i );
                    active_group_index = i;
                    break;
                }
            }
            else
            {
                if( next_available_index < 0 )
                    next_available_index = i;
            }
        }

        if( g_tracing ) dump( 'save group:  step a' );

        if( active_group_index < 0 )
        {
            active_group_index = next_available_index;
        }
        else
        {
            // wipe out whatever is there.

//             InstaBucket.clear_group_exp_tla_names( group_name );
            var save_name = 'Grouping' + active_group_index;
            this.prefs.deleteBranch( save_name )

            if( g_tracing ) dump( 'save group:  cleared user prefs ok' );
        }

        var save_name = 'Grouping' + active_group_index + '.name';
        this.prefs.setCharPref( save_name, group_name );

        if( g_tracing ) dump( 'save group:  save group name ok' );

        for( var i = 0 ; i < 10 ; i ++)
        {
            var save_name = 'Grouping' + active_group_index + '.tla' + i;

            var tla = tla_names[ i ];

            if( "undefined" == typeof( tla ) )
                continue;

            if( g_tracing ) dump( 'save group:  saving ' + save_name + ' tla: ' + tla );

            this.prefs.setCharPref( save_name, tla );

            if( g_tracing ) dump( 'save group:  saved ok: ' + save_name + ' tla: ' + tla );
        }

    },

    clear_group_exp_tla_names: function( group_name )
    {
        var active_group_index = -1;
        var next_available_index = -1;

        for( var i = 0 ; i < 40 ; i ++)
        {
            var save_name = 'Grouping' + i + '.name';
            if( this.prefs.prefHasUserValue( save_name ) )
            {
                var g_name = this.prefs.getCharPref( save_name );
                if( g_name == group_name )
                {
                    active_group_index = i;
                    break;
                }
            }
            else
            {
                next_available_index = i;
            }
        }

        if( active_group_index < 0 )
        {
            return;
        }

        var save_name = 'Grouping' + active_group_index;

        if( g_tracing ) dump(' about to delete branch: ' + save_name );
        this.prefs.deleteBranch( save_name )
        if( g_tracing ) dump(' deleted branch ok: ' + save_name );
    },

    // default values don't show up in 'pref has user value'
    // so try and load, if it throws just ignore.
    //
    // todo: find a better way to use default values.
    get_char_pref: function( save_name )
    {
        var loaded_value = '';
        try
        {
            loaded_value = this.prefs.getCharPref( save_name );
        }
        catch(e)
        {
            // do nothing.
        }
        return loaded_value;
    },

    load_group_exp_tla_names: function( group_name )
    {
        var names = new Array();
        try
        {
            if( null == this.prefs )
            {
                this.startup();
            }

            var active_group_index = -1;

            for( var i = 0 ; i < 40 ; i ++)
            {
                var save_name = 'Grouping' + i + '.name';
//                 if( this.prefs.prefHasUserValue( save_name ) )
                if( true )
                {
//                     var g_name = this.prefs.getCharPref( save_name );
                    var g_name = InstaBucket.get_char_pref( save_name );
                    if( g_name == group_name )
                    {
                        active_group_index = i;
                        break;
                    }
                }
            }

            if( active_group_index < 0 )
                return names;

            for( var i = 0 ; i < 40 ; i ++)
            {
                var save_name = 'Grouping' + active_group_index + '.tla' + i;
//                 if( this.prefs.prefHasUserValue( save_name ) )
                if( true )
                {
//                     var tla = this.prefs.getCharPref( save_name );
                    var tla = InstaBucket.get_char_pref( save_name );
                    if( tla.length > 0 )
                    {
                        names.push( tla );
                    }
                }
            }
        }
        catch(e)
        {
            if( g_testing )
            {
                dump('load group exp tla names:' );
                dump( e );
            }
            else
            {
                alert('load group exp tla names:\n' + e);
            }
        }
        return names;
    },

    // store a long list of tlas
    // each tla is a key to get the entire experiment.

    load_all_exp_tla_names: function()
    {
        var names = new Array();
        try
        {
            var sn_root = 'experiment' + '.experiment_tlas';

            if( null == this.prefs )
            {
                this.startup();
            }
            var tla_save_names_list = this.prefs.getChildList( sn_root, { } );

            var tla_names = new Array();

            for( var i in tla_save_names_list )
            {
                var sn = tla_save_names_list[i];
                if( g_testing ) dump("sn = " + sn + '\n');
                var tla = this.prefs.getCharPref( sn );
                if( g_testing ) dump("loaded tla = " + tla + '\n');
                tla_names[ tla ] = 1;
            }

            // use the hash to keep them unique.
            for( var t in tla_names )
            {
                if( g_testing ) dump("t = " + t + '\n');
                names.push( t );
            }

            // InstaBucket.experiment_tlas.tla_1
        }
        catch(e)
        {
            dump('load all exp tla names:\n' );
            dump( e  + '\n');
        }
        return names;
    },

    load_exp_pref_index: function( exp_index )
    {
        // given an index, get back the tla
        // they are saved by index in the preferences dialog
        /*

        <textbox preference="pref_exp_name1" id="exp-name1" size="10" maxlength="8"/>

        <preference id="pref_exp_name1" name="InstaBucket.experiment1.tla" type="string"/>

        */

        // InstaBucket.experiment_showing.tla_1

        if( null == this.prefs )
        {
            this.startup();
        }

        var tla = '';
        var savename = '';

        try
        {
            //  InstaBucket.experiment1.tla
            savename = 'experiment' + exp_index + '.tla';

//             if( this.prefs.prefHasUserValue( savename ) )
                tla = this.prefs.getCharPref( savename );

//             alert(' tla: ' + tla +
//                 '\nloaded from savename:' +
//                 '\n' + savename );
        }
        catch(e)
        {
            dump('caught exception in load_exp_pref_index ' +
                'savename:' + savename +
                'index:' + exp_index + '\n');
        }
        return tla;
    },

    load_pref_safe: function( savename )
    {
        var result = '';
        try
        {
            result = this.prefs.getCharPref( savename );
        }
        catch(e)
        {
            dump('**exception** load pref safe, failed to load savename: ' + savename + '\n' );
        }
        return result;
    },

    load_exp_pref_tla: function( exp_tla )
    {
        var pref_experiment = null;

        try
        {
            if( g_tracing ) dump('load exp pref tla: ' + exp_tla + '\n' );
            if( null == exp_tla || "undefined" == typeof( exp_tla ) || exp_tla.length < 1 )
            {
//                 dump(' tla to load came as null or too short ' + exp_tla + '\n' );
                return null;
            }

            var sn_root = 'experiment.' + exp_tla;
            var tla = '';
            var full = '';

//             if( g_testing ) sn_root = 'InstaBucket.' + sn_root;

            if( null == this.prefs )
            {
                dump( 'prefs was null, calling startup\n' );
                this.startup();
            }

            var savename_tla = sn_root + '.tla';
//          tla = this.prefs.getCharPref( savename_tla );
            tla = this.load_pref_safe( savename_tla );
            if( g_tracing ) dump('loaded tla : ' + tla + '\n' );

            savename_full = sn_root + '.fullname';
//          full = this.prefs.getCharPref( savename_full );
            full = this.load_pref_safe( savename_full );
            if( g_tracing ) dump('loaded full: ' + full + '\n' );

            if( !tla )
            {
                return null;
            }
            // InstaBucket.experiment.{tla}.pos.uk_id

            var pos_list = this.prefs.getChildList(sn_root + '.pos', { } );
            var bucket_names_list = this.prefs.getChildList(sn_root + '.bucket_names', { } );

            pref_experiment = new exp_pref_bucket();

            pref_experiment.tla = tla;
            pref_experiment.full_name = full;

            pref_experiment.id_pos = new Array();
            pref_experiment.bucket_names = new Array();

            for(var pos_sn in pos_list)
            {
                var save_name = pos_list[ pos_sn ];

                var pos_regex = /(.*)\.([^.]+)_id$/;
                var pos_match = pos_regex.exec( save_name );
                if( pos_match == null )
                {
                    // todo: change where the abacus stuff is stored.
                    if( g_tracing )
                        dump('pos_sn match null: ' + save_name + '\n' );
                    continue;
                }
                var pos = pos_match[2];
//              var id = this.prefs.getCharPref( save_name );
                var id = this.load_pref_safe( save_name );

                if( g_tracing ) dump('pos: ' + pos + ' id: ' + id + '\n' );

                pref_experiment.set_pos_id( pos, id );

                var save_name_abacus = pos_match[1] + '_abacus.' + pos;
                if( g_tracing ) dump(' loading abacus info: ' + save_name_abacus + '\n');
//                 if( this.prefs.prefHasUserValue( save_name_abacus ) )
                if( true )
                {
//                  var abacus_details = InstaBucket.get_char_pref( save_name_abacus );
                    var abacus_details = this.load_pref_safe( save_name_abacus );
                    pref_experiment.set_pos_abacus_details( pos, abacus_details );
                    if( g_tracing ) dump(' loaded abaucus info: ' + abacus_details + '\n' );
                }
            }

            for( var bucket_sn in bucket_names_list )
            {
                var save_name = bucket_names_list[ bucket_sn ];

                var bn_regex = /(\d+)$/;
                var bn_match = bn_regex.exec( save_name );

                if( g_testing ) dump("loading: " + save_name + '\n');

//              var bucket_name = this.prefs.getCharPref( save_name );
                var bucket_name = this.load_pref_safe( save_name );

                pref_experiment.set_bucket_name( bn_match[1], bucket_name );
            }
        }
        catch(e)
        {
//             e = unescape( e );
            dump('**exception** load exp pref for tla<' + exp_tla + '>:\n' );
            if( e.length > 90 )
            {
                e = substr( e, 0, 90 );
            }
            dump( e + '\n' );
        }
        return pref_experiment;
    },

    set_current_url: function( url )
    {
        try
        {
            savename = 'current.url';
            InstaBucket.last_url = url;

            this.prefs.setCharPref( savename, url );
        }
        catch(e)
        {
            alert('set current url:\n' + e);
        }
    },

    get_current_url: function( )
    {
        try
        {
            var url = '';
            savename = 'current.url';

            if( this.prefs.prefHasUserValue( savename ) )
                url = this.prefs.getCharPref( savename );
        }
        catch(e)
        {
            alert('get current url:\n' + e);
        }
        return url;
    },


    // load prefs, if something changes, then let the caller know.
    // items loaded:
    // position of the experiments
    // bucket values are copied from old visible experiments

    loadPrefs: function( known_change )
    {
        try
        {
            if( !check_if_monitoring_disabled ) return;
            if( check_if_monitoring_disabled() ) return;

            dump('*\n*\n*\ncalled old version of prioritize_experiments\n*\n*\n');
            this.prioritize_experiments( known_change );
        }
        catch(e)
        {
            dump( '**exception** load prefs:\n' + e + '\n' );
        }
    },

    // grab all the current experiment TLAs
    // then possibly add more based on html and omniture stuff
    prioritize_experiments: function( known_change )
    {
        var changed = false;
        var i;
        try
        {
            if( !check_if_monitoring_disabled ) return;
            if( check_if_monitoring_disabled() ) return;

            if( "undefined" == typeof( known_change ) )
                known_change = true;

            var key = omniture_buckets.calculate_default_key();
            dump('>>>>>>>>>> prioritize experiments  ' + known_change + '\n' + key + '\n');

            // index numbers align with status bar ids.

            var old_list = new Array();

            for( var el in this.exps_list )
            {
                old_list.push( this.exps_list[ el ] );
            }

            this.exps_list = new Array();

            var max_status_bar_items = 20;

            if( InstaBucket.get_show_experiments_based_on_html_content() )
            {
                InstaBucket.prioritize_add_html_experiments();
                // update_group_html
            }

            dump('  prioritize : after group html added\n');
            for( var i = 0 ; i < this.exps_list.length ; i ++)
            {
                var exp_added = this.exps_list[i];
                dump( '    ' + exp_added.tla + ' ' + exp_added.full_name + '\n' );
            }

            if( InstaBucket.get_show_experiments_based_on_omniture_content() )
            {
                InstaBucket.prioritize_add_omniture_experiments();
            }

            dump('  prioritize : after group omniture added\n');
            for( var i = 0 ; i < this.exps_list.length ; i ++)
            {
                var exp_added = this.exps_list[i];
                dump( '    ' + exp_added.tla + ' ' + exp_added.full_name + '\n' );
            }

//             dump_exps('before adding group name experiments');
            // finally load in the group of user requests, always fixed, always shown
            var tla_added_count = 0;
            var active_group_name = InstaBucket.get_active_group_name();
            var user_group_tlas = InstaBucket.load_group_exp_tla_names( active_group_name );

            for( var i = 0 ; i < user_group_tlas.length ; i ++)
            {
                var exp_tla = user_group_tlas[i];
                var exp_obj = InstaBucket.load_exp_pref_tla( exp_tla );

                if( !exp_obj )
                {
                    dump(' null obj from tla: ' + exp_tla + '\n' );
                    continue;
                }

                // this seems to be putting in undefined
                this.exps_list.unshift( exp_obj );
                tla_added_count++;
            }

//             dump_exps('after adding group name experiments');

            dump('\n\n  prioritize : before group duplicates removed\n');

            for( var i = 0 ; i < this.exps_list.length ; i ++)
            {
                var exp_added = this.exps_list[i];
                dump( '    ' + exp_added.tla + ' ' + exp_added.full_name + '\n' );
            }


            InstaBucket.remove_duplciates();

            dump('\n\n  prioritize : after group duplicates removed\n');
            for( var i = 0 ; i < this.exps_list.length ; i ++)
            {
                var exp_added = this.exps_list[i];
                dump( '    ' + exp_added.tla + ' ' + exp_added.full_name + '\n' );
            }
        }
        catch(e)
        {
            dump( "**exception** zzz load prefs: i = " + i + "\n\n" + e + '\n');
        }
        return changed;
    },

    prioritize_add_html_experiments: function()
    {
        try
        {
            // this is called when the page is loaded.
//             active_page_abacus.discover_html_content();

            var html_exps = new Array();
            try
            {
                if( html_buckets && typeof( html_buckets ) != "undefined" )
                {
                    html_exps = html_buckets.get();
                }
            }
            catch(e)
            {
                // argh!
            }

//             dump_exps( 'prioritize add html enter.' );

            var html_added_count = 0;

            for( var html_id in html_exps )
            {
                if( html_id < 1 )
                {
                    dump('skipping html experiment with id of: ' + html_id + '\n');
                    continue;
                }
//                 dump_exps( 'prioritize add html, id: ' + html_id );

                var html_experiment = html_exps[ html_id ];
                var html_id = html_experiment.id;
                var html_bucket = html_experiment.bucket;

                var html_exp_pref = InstaBucket.find_exp_with_id( html_id );
                if( !html_exp_pref  )
                {
                    dump('unable to get experiment for id: ' + html_id + '\n');
                    continue;
                }

                // at this point we are adding experiments, not setting buckets
//                 html_exp_pref.bucket = html_bucket;
                html_exp_pref.bucket = -1;


                html_added_count++;
                this.exps_list.push( html_exp_pref );
                // todo: remove duplicate
            }
        }
        catch(e)
        {
            dump( '**exception** prioritize add html experiments:\n' + e + '\n' );
        }
    },

    prioritize_add_omniture_experiments: function()
    {
        try
        {
            var omn_exps = new Array();
            try
            {
                if( omniture_buckets && typeof( omniture_buckets ) != "undefined" )
                {
                    omn_exps = omniture_buckets.get();
                }
            }
            catch(e)
            {
                // argh!
            }

//             dump_exps( 'prioritize add omniture enter.' );

            var omn_added_count = 0;

            for( var om_id in omn_exps )
            {
                if( om_id < 1 )
                {
                    dump('skipping omniture experiment with id of: ' + om_id + '\n');
                    continue;
                }
//                 dump_exps( 'prioritize add omniture, id: ' + om_id );

                var om_experiment = omn_exps[ om_id ];
                var om_id = om_experiment.id;
                var om_bucket = om_experiment.bucket;

                var om_exp_pref = InstaBucket.find_exp_with_id( om_id );

                // previously  find_exp_with_id  would return null if the item was hidden.
                // now it returns any match
                // we may need to call  get_is_experiment_hidden
                //this.get_is_experiment_hidden( exp_from_cache.tla ) )
                if( !om_exp_pref )
                {
                    dump('unable to get experiment for id: ' + om_id + '\n');
                    dump('creating a new experiment to carry the id back\n');
                    // continue;

                    var cur_pos = InstaBucket.get_pos();
                    // exp_pref_bucket
                    om_exp_pref = new exp_pref_bucket();
                    om_exp_pref.tla = om_id;
                    om_exp_pref.full_name = om_id + ' experiment';
                    om_exp_pref.id = om_id;
                    om_exp_pref.bucket = om_bucket;
                    // om_exp_pref.description = om_id + ' found in omniture, unknown';

                    // todo: get current point of sale
                    om_exp_pref.set_pos_abacus_details(cur_pos,
                        om_id + ' : new experiment found in omniture traffic.');

                    om_exp_pref.set_pos_id(cur_pos, om_id);
                    om_exp_pref.set_bucket_name(0, 'control');
                    om_exp_pref.set_bucket_name(0, 'on');

                    this.save_exp_pref( new_exp );
                    this.add_tla_if_not_in_use( new_exp );
                }

                // only adding the experiments, not setting buckets
                om_exp_pref.bucket = -1;
//                 om_exp_pref.bucket = om_bucket;

                omn_added_count++;
                this.exps_list.push( om_exp_pref );

                // todo: remove duplicate
            }
        }
        catch(e)
        {
            dump( '**exception** prioritize omniture:\n' + e + '\n' );
        }
    },

    // go from last to first, removing duplicates.
    // going forward seems to remove the wrong ones.
    // this is because when the experiments are used,
    // they are taken in reverse order, those added / pushed on last
    // are the ones first added to the status bar.
    //
    // also remove those which are hidden.
    remove_duplciates: function()
    {
        try
        {
//             dump_exps( 'remove duplicates enter' );
            var found_duplicate = true;
            var max_loop = 90;

            while( found_duplicate && max_loop-- > 0 )
            {
                found_duplicate = false;
                var ids_found = new Array();

                for( var i = 0 ; i < this.exps_list.length ; i++ )
                {
                    var dup_tla = this.exps_list[i].tla;

                    if( "undefined" == typeof( ids_found[ dup_tla ] ) )
                    {
                        ids_found[ dup_tla ] = 0;
                    }

                    ids_found[ dup_tla ]++;

                    // todo: make more efficient
                    var is_hidden = this.get_is_experiment_hidden( dup_tla );

                    if( is_hidden || ids_found[ dup_tla ] > 1 )
                    {
                        var reason = 'duplicate';
                        if( is_hidden ) reason = 'hidden';
                        dump('remove ' + reason + ': id: ' + dup_tla + ' id count: ' + ids_found[ dup_tla ] + ' total count: ' +
                        this.exps_list.length + '\n' );

                        found_duplicate = true;
                        // remove duplicate experiment.
                        this.exps_list.splice( i, 1 );

                        // the current guy was removed, recheck the index
                        i--;

                        continue;
                    }
//                     dump( 'tla count for ' + dup_tla + ' is: ' + ids_found[ dup_tla ] + '\n' );
                }
            }
//             dump_exps( 'remove duplicates exit' );
        }
        catch(e)
        {
            dump( '**exception** remove duplicates:\n' + e + '\n' );
        }
    },

    // Called when events occur on the preferences

    // Called when requests go out from page, such as omniture

    // todo: ignore until the prefs dialog closes, or loses focus

    observe: function(subject, topic, data)
    {
        try
        {
            if( !check_if_monitoring_disabled ) return;
            if( check_if_monitoring_disabled() ) return;

//             dump('observe called, topic = ' + topic + '\n');

            // Called just before an HTTP Request is sent
            if (topic == 'http-on-modify-request')
            {
                active_page_abacus.observeSiteCatalystRequests(subject, topic, data);
                return;
            }

            if (topic == "nsPref:changed")
            {
                if( !InstaBucket.is_pref_to_ignore( data ) )
                {

                    for( var i = 0 ; i < 20 ; i ++) dump('\n');
                    dump('observe :: ' + subject + ' :: ' + topic + ' :: ' + data + '\n');
                    for( var i = 0 ; i < 20 ; i ++) dump('\n');

                    InstaBucket.update_prefs();
                }
            }
        }
        catch(e)
        {
            dump("**exception**\nobserve:\n" + e);
        }
    },

    // todo: learn how to use regex without regex object
    // just put it all in one line.
    is_pref_to_ignore: function( save_name )
    {
        try
        {
            var tla_regex = /experiment\d+\.tla/;
            if( tla_regex.exec( save_name ) )
                return true;

            // tla and id
            var active_id = /active.status.bar/;
            if( active_id.exec( save_name ) )
                return true;

            // urls
            var current_url = /current.url/;
            if( current_url.exec( save_name ) )
                return true;

            // urls
            var sb_pref_ln = /experiment.statusbar.use_/;
            if( sb_pref_ln.exec( save_name ) )
                return true;

            // grouping tla
            var group_tla = /Grouping\d+.tla/;
            if( group_tla.exec( save_name ) )
                return true;

            var exp_bucket_name = /bucket_names.name_/;
            if( exp_bucket_name.exec( save_name ) )
                return true;

            var exp_pos_id = /\.pos\..*?_id/;
            if( exp_pos_id.exec( save_name ) )
                return true;
        }
        catch(e)
        {
            dump('**exception** is pref to ignore:\n' + e + '\n');
        }
    },

    // load preferences, update the display
    //
    update_prefs: function( forced )
    {
        try
        {
            if( !check_if_monitoring_disabled ) return;
            if( check_if_monitoring_disabled() ) return;

            if( "undefined" == typeof( forced ) )
                forced = false;


//             dump_exps( 'update prefs' );


            // we get called fairly often.
            // update when something changes that we care about.

            // todo: figure out when to call this, to do it less often.
            active_page_abacus.discover_html_content( );

            var somethingChanged = this.prioritize_experiments( forced );

            this.refresh_buckets();

//             if( somethingChanged || forced || !InstaBucket.haveShownSomething )
//             {
//                 dump('update prefs, something changed\n');
//                 this.refresh_buckets();
//             }
//             else
//             {
//                 if( "html" == InstaBucket.get_bucket_detection_preference() )
//                 {
//                     dump('update prefs, html bucket stuff, so refresh.\n');
//                     this.refresh_buckets( true );
//                 }
//                 else
//                 {
//                     dump('update prefs, nothing changed, exit\n');
//                 }
//             }
        }
        catch(e)
        {
            alert("observe:\n" + e);
        }
    },

    // https://developer.mozilla.org/en/Code_snippets/Tabbed_browser
    url_change: function()
    {
    },

    // watchExp: function(index, expID, expTLA)

    get_is_experiment_hidden: function( experiment_tla )
    {
        try
        {
            var save_name = 'exp.to.hide';
            var current_hidden_items = '';

            // numeric values fail on to upper case
            experiment_tla = String( experiment_tla );

            experiment_tla = experiment_tla.toUpperCase();

//             dump_exps( 'get is experiment hidden: ' + experiment_tla );


            if( this.prefs.prefHasUserValue( save_name ) )
            {
                current_hidden_items = this.prefs.getCharPref( save_name );
            }
            else
            {
//                 dump('hidden : nothing found under ' + save_name + '\n');
                return false;
            }

            var tla_list = current_hidden_items.split(',');
//             dump('hidden : parsing: ' + tla_list + ' gave a count of: ' + tla_list.length + '\n');

            var count = tla_list.length;
            for( var i = 0 ; i < count ; i++)
            {
                var hidden_tla = tla_list[i];
                if( hidden_tla == experiment_tla )
                {
//                     dump('  hidden: found match for ' + experiment_tla + '\n');
                    return true;
                }
                else
                {
//                     dump('  hidden: ' + hidden_tla + ' was not match for ' + experiment_tla + '\n');
                }
            }

            return false;
        }
        catch(e)
        {
            dump('**exception** get is experiment hidden:\n' + e + '\n');
        }
    },

    hide_experiment: function( experiment_tla, is_hidden )
    {
        try
        {
            dump('   hide experiment: ' + experiment_tla + '\n');

            // if the experiment_tla is numeric, then to upper case fails
            // so we must convert to string first.

            experiment_tla = String( experiment_tla );

            experiment_tla = experiment_tla.toUpperCase();

            var save_name = 'exp.to.hide';
            var current_hidden_items = '';

            if( this.prefs.prefHasUserValue( save_name ) )
            {
                current_hidden_items = this.prefs.getCharPref( save_name );
            }

            if( is_hidden )
            {
                current_hidden_items += ',' + experiment_tla;
            }
            else
            {
                var tla_list = current_hidden_items.split(',');
                var new_hidden_items = '';
                var delimiter = '';
                for( var i = 0 ; i < tla_list.length ; i ++)
                {
                    var tla_from_list = tla_list[i];
                    if( tla_from_list == experiment_tla )
                    {
                        dump('removing tla: ' + experiment_tla + ' from list\n');
                        continue;
                    }
                    new_hidden_items += delimiter + tla_from_list;
                    delimiter = ',';
                }
                dump('modified list, was:' + current_hidden_items + ' : changing to: ' + new_hidden_items + '\n');
                current_hidden_items = new_hidden_items;
            }

            this.prefs.setCharPref( save_name, current_hidden_items );
        }
        catch(e)
        {
            dump('**exception** hide experiment:\n' + e + '\n');
        }
    },

    set_active_status_bar_item_from_popup_node_id: function( )
    {
        var status_bar_index = -1;
        try
        {
            var nodeId = document.popupNode.id;
            var id_len = nodeId.length;
            status_bar_index = nodeId.substr( id_len-1 );
            this.set_active_status_bar_item( status_bar_index );
        }
        catch(e)
        {
            dump('set_active_status_bar_item_from_popup_node_id:\n' + e + '\n');
        }
        return status_bar_index;
    },

    set_active_status_bar_item: function( nodeId )
    {
        try
        {
            dump('set active status bar item: ' + nodeId + '\n' );
            this.prefs.setCharPref( 'active.status.bar.id', nodeId );

            var exp_tla = this.load_exp_pref_index( nodeId );

            this.set_active_status_bar_tla( exp_tla );
        }
        catch(e)
        {
            dump('**exception** set active status bar item:\n' + e + '\n' );
        }
    },

    get_active_status_bar_item: function()
    {
        try
        {
            var save_name = 'active.status.bar.id';
            if( !this.prefs.prefHasUserValue( save_name ) )
            {
                return '';
            }
            return this.prefs.getCharPref( save_name );
        }
        catch(e)
        {
            alert('get active status bar item\n' + e);
        }
    },

    set_is_update_disabled: function( disable )
    {
        var save_value = 'no';
        if( disable )
        {
            save_value = 'yes';
        }

        dump( 'insta bucket: set disable: ' + save_value + '\n' );
        var save_name = 'disable.auto.updates';
        this.prefs.setCharPref( save_name, save_value );
    },

    get_is_update_disabled: function()
    {
        var is_disabled = 'no';

        try
        {
            var save_name = 'disable.auto.updates';

            if( this.prefs.prefHasUserValue( save_name ) )
            {
                is_disabled = this.prefs.getCharPref( save_name );
            }
            else
            {
                // default to no, not disabled
                this.set_is_update_disabled( false );
            }
        }
        catch(e)
        {
            dump(' get is update disabled:\n' + e);
        }

        var bool_disabled = (is_disabled == 'yes');

        return bool_disabled;
    },

    set_is_showing_full_names: function( use_full )
    {
        var save_value = 'no';
        if( use_full )
            save_value = 'yes';

        dump( 'insta bucket: set show full names: ' + save_value + '\n' );
        this.prefs.setCharPref( 'experiment.statusbar.use_long_name', save_value );
    },

    get_is_showing_full_names: function( tla )
    {
        var show_full = 'yes';

        try
        {
            var save_name = 'experiment.statusbar.use_long_name';

            if( this.prefs.prefHasUserValue( save_name ) )
            {
                show_full = this.prefs.getCharPref( save_name );
            }
            else
            {
                // default to yes, show the full names.
                // previous users will default to long names, just for shock value.
                this.set_is_showing_full_names( true );
            }
        }
        catch(e)
        {
            alert(' get is showing full names:\n' + e);
        }

        var is_showing_full = (show_full == 'yes');
//         dump( 'insta bucket: get show full names: ' + is_showing_full + '\n' );

        return is_showing_full;
    },

    set_is_reloading_on_bucket_change: function( auto_reload )
    {
        var save_name = 'bucketChange.reloadPage';

        var save_value = 'no';
        if( auto_reload )
            save_value = 'yes';

        dump( 'insta bucket: set reload on bucket change: ' + save_value + '\n' );
        this.prefs.setCharPref( save_name, save_value );
    },

    get_is_reloading_on_bucket_change: function()
    {
        var auto_reload = 'yes';

        try
        {
            var save_name = 'bucketChange.reloadPage';

            if( this.prefs.prefHasUserValue( save_name ) )
            {
                auto_reload = this.prefs.getCharPref( save_name );
            }
            else
            {
                // default to turn this on.
                auto_reload = 'yes';
                this.set_is_reloading_on_bucket_change( true );
            }

        }
        catch(e)
        {
            alert(' get is showing full names:\n' + e);
        }

        var is_reload_set = (auto_reload == 'yes')
        dump( 'insta bucket: get is reload set: ' + is_reload_set + '\n' );

        return is_reload_set;
    },

    get_show_experiments_based_on_omniture_content: function()
    {
        var show_via_page_content = 'yes';

        try
        {
            var save_name = 'Grouping.Show.From.Omniture';
            if( this.prefs.prefHasUserValue( save_name ) )
            {
                show_via_page_content = this.prefs.getCharPref( save_name );
            }
            else
            {
                // default to turn this on.
                show_via_page_content = 'yes';
                this.set_show_experiments_based_on_omniture_content( true );
            }
        }
        catch(e)
        {
            alert('get show experiment based on omniture:\n' + e);
        }

        var is_use_page = (show_via_page_content == 'yes')
//         dump( 'insta bucket: get show experiment based on page: ' + is_use_page + '\n' );

        return is_use_page;
    },

    set_show_experiments_based_on_omniture_content: function(show_via_page_content)
    {
        try
        {
            var save_name = 'Grouping.Show.From.Omniture';
            var group_omn = 'no';
            if( show_via_page_content )
                group_omn = 'yes';

            dump( 'insta bucket: set grouping show from html: ' + group_omn + '\n' );
            this.prefs.setCharPref( save_name, group_omn );
        }
        catch(e)
        {
            alert('set show experiments based on omniture content:\n' + e);
        }
    },

    // get_show_experiments_based_on_page_content
    get_show_experiments_based_on_html_content: function()
    {
        var show_via_page_content = 'yes';

        try
        {
            var save_name = 'Grouping.Show.From.Html';
            if( this.prefs.prefHasUserValue( save_name ) )
            {
                show_via_page_content = this.prefs.getCharPref( save_name );
            }
            else
            {
                // default to turn this on.
                show_via_page_content = 'yes';
                this.set_show_experiments_based_on_html_content( true );
            }
        }
        catch(e)
        {
            alert('get show experiments based on html:\n' + e);
        }

        var is_use_page = (show_via_page_content == 'yes')
//         dump( 'insta bucket: get show experiment based on page: ' + is_use_page + '\n' );

        return is_use_page;
    },

    set_show_experiments_based_on_html_content: function(show_via_page_content)
    {
        try
        {
            var save_name = 'Grouping.Show.From.Html';
            var group_html = 'no';
            if( show_via_page_content )
                group_html = 'yes';

            dump( 'insta bucket: set grouping show from html: ' + group_html + '\n' );
            this.prefs.setCharPref( save_name, group_html );
        }
        catch(e)
        {
            alert('set show experiments based on page content:\n' + e);
        }
    },

    get_is_bucket_via_cookie: function()
    {
        var use_cookie = 'yes';

        try
        {
            var save_name = 'bucketChange.useCookies';
            if( this.prefs.prefHasUserValue( save_name ) )
            {
                use_cookie = this.prefs.getCharPref( save_name );
            }
            else
            {
                // default to turn this on.
                use_cookie = 'yes';
                this.set_is_bucket_via_cookie( true );
            }
        }
        catch(e)
        {
            alert('get is bucket via cookie:\n' + e);
        }

        var is_use_cookie = (use_cookie == 'yes')
        dump( 'insta bucket: get is bucket via cookie: ' + is_use_cookie + '\n' );

        return is_use_cookie;
    },

    set_is_bucket_via_cookie: function( set_via_cookie )
    {
        var save_name = 'bucketChange.useCookies';
        var cookie_yes_no = 'no';
        if( set_via_cookie )
            cookie_yes_no = 'yes';

        dump( 'insta bucket: set is bucket via cookie: ' + cookie_yes_no + '\n' );
        this.prefs.setCharPref( save_name, cookie_yes_no );
    },

    get_is_detect_bucket_via_omniture: function()
    {
        var use_omniture = 'yes';

        try
        {
            var save_name = 'getBuckets.useOmniture';
            if( this.prefs.prefHasUserValue( save_name ) )
            {
                use_omniture = this.prefs.getCharPref( save_name );
            }
            else
            {
                // default to turn this on.
                use_omniture = 'yes';
                this.set_is_detect_bucket_via_omniture( true );
            }
        }
        catch(e)
        {
            alert('get is detect bucket via cookie:\n' + e);
        }

        var is_use_omniture = (use_omniture == 'yes')
        dump( 'insta bucket: get is bucket read via omniture: ' + is_use_omniture + '\n' );

        return is_use_omniture;
    },

    set_is_detect_bucket_via_omniture: function( get_via_omniture )
    {
        var save_name = 'getBuckets.useOmniture';
        var omn_yes_no = 'no';
        if( get_via_omniture )
            omn_yes_no = 'yes';

        dump( 'insta bucket: set is detect bucket via omniture: ' + omn_yes_no + '\n' );
        this.prefs.setCharPref( save_name, omn_yes_no );
    },

    get_is_detect_bucket_via_html: function()
    {
        var use_html = 'yes';

        try
        {
            var save_name = 'getBuckets.useHtml';
            if( this.prefs.prefHasUserValue( save_name ) )
            {
                use_html = this.prefs.getCharPref( save_name );
            }
            else
            {
                // default to turn this on.
                use_html = 'no';
                this.set_is_detect_bucket_via_html( true );
            }
        }
        catch(e)
        {
            alert('get is detect bucket via html:\n' + e);
        }

        var is_use_html = (use_html == 'yes')
        dump( 'insta bucket: get is bucket read via html: ' + is_use_html + '\n' );

        return is_use_html;
    },

    set_is_detect_bucket_via_html: function( get_via_html )
    {
        var save_name = 'getBuckets.useHtml';
        var html_yes_no = 'no';
        if( get_via_html )
            html_yes_no = 'yes';

        dump( 'insta bucket: set is detect bucket via html: ' + html_yes_no + '\n' );
        this.prefs.setCharPref( save_name, html_yes_no );
    },


    // we are losing context when mouse clicks happen
    // work around that by saving what was clicked on.
    set_active_status_bar_tla: function( active_tla )
    {
        try
        {
            dump('set active status bar tla: ' + active_tla + '\n' );
            var save_name = 'active.status.bar.tla';
            this.prefs.setCharPref( save_name, active_tla );
        }
        catch(e)
        {
            dump('**exception** set active status bar tla:\n' + e + '\n');
        }
    },

    get_active_status_bar_tla: function()
    {
        try
        {
            var save_name = 'active.status.bar.tla';
            if( !this.prefs.prefHasUserValue( save_name ) )
            {
                dump('get active status bar tla found no user value for:' + save_name + '\n');
                return '';
            }
            var active_tla = this.prefs.getCharPref( save_name );
            dump('get active status bar tla found user value :' + active_tla + '\n');
            return active_tla;
        }
        catch(e)
        {
            alert('get active status bar tla\n' + e);
        }
    },


    // todo: have one token passed in, representing the experiment.
    watchExp: function(tla)
    {
        try
        {
//             // when we do our own context menu stuff, we don't get the popup node.
//             var nodeId = document.popupNode.id;
//             var id_len = nodeId.length;
//             var status_bar_index = nodeId.substr( id_len-1 );
//             this.set_active_status_bar_item( status_bar_index );

//             var id_len = nodeId.length;

//             // last character gives index.
//             var status_bar_index = nodeId.substr( id_len-1 );

            var status_bar_index = this.get_active_status_bar_item();

            this.set_exp_pref_index(status_bar_index, tla);

            this.refresh_buckets();
        }
        catch(e)
        {
            alert("watch exp:\n" + e);
        }
    },

    // todo: store the latest experiment object in the status bar slot
    // experiment object is the guy who holds all the results from last request.
    setExperimentBucket: function( status_bar_index, bucket_number)
    {
        try
        {
            var exp_obj = this.exps_list[status_bar_index];

            if( typeof( exp_obj ) == "undefined" || exp_obj == null )
            {
                alert('failed to get exp obj for index:' + status_bar_index);
                return;
            }

            var experiment_id = exp_obj.get_pos_id( InstaBucket.get_pos() );

            dump('bucket set request, pos:' + InstaBucket.get_pos() +
                    ', exp_id:' + experiment_id + ' bucket:' + bucket_number + '\n');

            ExpBucketSetter.set_bucket(experiment_id, bucket_number);
        }
        catch(e)
        {
            alert('set experiment bucket:\n' + e);
        }
    },

    onMenuIDEnter: function()
    {
        try
        {
            var win = window.open("chrome://instabucket/content/id_popup.xul",
                "idsetForInstabucket", "chrome,centerscreen");
        }
        catch(e)
        {
            alert(' on menu id enter:\n' + e);
        }
    },

    onMenuChangeGroup: function()
    {
        try
        {
            var win = window.open("chrome://instabucket/content/group_popup.xul",
                "groupingForInstabucket", "chrome,centerscreen");
        }
        catch(e)
        {
            alert(' on menu change group:\n' + e);
        }
    },

    onMenuCheckBucket: function()
    {
        try
        {
//             var nodeId = document.popupNode.id;
//             var id_len = nodeId.length;
//             var status_bar_index = nodeId.substr( id_len-1 );
//             this.set_active_status_bar_item( status_bar_index );

            // this.set_active_status_bar_item_from_popup_node_id();

            var status_bar_index = this.get_active_status_bar_item();

            var pref_experiment = this.exps_list[status_bar_index];

            var experiment_id = pref_experiment.get_pos_id( InstaBucket.get_pos() );

            if( g_tracing ) dump (' pos = ' + InstaBucket.get_pos() + ' id = ' + experiment_id );

            if( experiment_id > 0 )
            {
                var url = ExpWebReader.build_url_use_internal_domain( experiment_id );

                var tBrowser = top.document.getElementById("content");
                var tab = tBrowser.addTab(url);
                tBrowser.selectedTab = tab;
            }
        }
        catch(e)
        {
            alert('on menu check bucket:\n' + e);
        }
    },

    onMenuSetBucket: function(bucket_number, using_context)
    {
        try
        {
//             var nodeId = document.popupNode.id;
//             var id_len = nodeId.length;
//             var status_bar_index = nodeId.substr( id_len-1 );

//             this.set_active_status_bar_item( status_bar_index );

            // var status_bar_index = this.set_active_status_bar_item_from_popup_node_id();

            var status_bar_index = this.get_active_status_bar_item();

            // the state is not open after making the selection.
//             var menu_id_small = 'bucket-context-menu';
//             var using_context = document.getElementById( menu_id_small ).
//                 state == "open";

            var item = null;
            var reload_after_bucket_set = InstaBucket.get_is_reloading_on_bucket_change();

            if( using_context )
            {
                // remove refresh check box from context menu
//                 item = document.getElementById('context-set-refresh-after');
//                 alert('using context, checked = ' + item.checked);
            }
            else
            {
                item = document.getElementById('full-set-refresh-after');
//                 alert('using full, checked = ' + item.checked);

                reload_after_bucket_set = item.checked;
                InstaBucket.set_is_reloading_on_bucket_change( reload_after_bucket_set );
            }


            this.setExperimentBucket( status_bar_index, bucket_number );

            // todo: change to async, get called when done.
            // reload_page;

            this.refresh_buckets( );

            // todo: catch request to show the menu
            // todo: set bucket choices according to experiment
            // todo: disable bucket choices that don't apply

//             document.getElementById("set-bucket-1").label = 'menu changed';
//             document.getElementById("set-bucket-2").visible = false;  // would be nice.
//             document.getElementById("set-bucket-3").disabled = true;
        }
        catch(e)
        {
            dump("**exception** on Menu Set Bucket:\n" + e + '\n');
        }
    },

    onMenuGetBucketUrl: function()
    {
        try
        {
//             var nodeId = document.popupNode.id;
//             var id_len = nodeId.length;
//             var status_bar_index = nodeId.substr( id_len-1 );

            // var status_bar_index = this.set_active_status_bar_item_from_popup_node_id();
            var status_bar_index = this.get_active_status_bar_item();

            var bucket_number = 1;

            // status bar item is set when menu appears
            // this.set_active_status_bar_item( status_bar_index );

            var exp_obj = this.exps_list[status_bar_index];

            if( typeof( exp_obj ) == "undefined" || exp_obj == null )
            {
                alert('failed to get exp obj for index:' + status_bar_index);
                return;
            }

            var pos = InstaBucket.get_pos();
            var experiment_id = exp_obj.get_pos_id( pos );

            dump('bucket get url request, pos:' + InstaBucket.get_pos() +
                    ', exp_id:' + experiment_id + ' bucket:' + bucket_number + '\n');

            var url = ExpBucketSetter.construct_url(experiment_id, bucket_number);
            var url_e3 = ExpBucketSetter.construct_e3_url(experiment_id, bucket_number);
            var dialog_title = 'Show URLs for setting Abacus experiment ' + experiment_id + ' on pos ' + pos;

            // alert (url );

            dump(' emain url: ' + url );
            dump(' e3    url: ' + url_e3 );
            dump('  about to open dialog for show_url_popup.xul\n');

            // access items passed in via:
            // document.getElementById("urlToDisplay");
            window.openDialog("chrome://instabucket/content/show_url_popup.xul",
                  dialog_title, "chrome,centerscreen",
                  { urle3ToDisplay: url_e3, urlToDisplay: url, POS: pos, experimentID: experiment_id } );


            // for debugging support: dump the values being stored for later use:
            omniture_buckets.dump();
            html_buckets.dump();
        }
        catch(e)
        {
            dump('**exception** on menu get bucket url\n' + e + '\n');
        }

    },

    onMenuHideExperiment: function()
    {
        try
        {
//             var nodeId = document.popupNode.id;
//             var id_len = nodeId.length;
//             var status_bar_index = nodeId.substr( id_len-1 );

            // var status_bar_index = this.set_active_status_bar_item_from_popup_node_id();
            var status_bar_index = this.get_active_status_bar_item();

            var exp_obj = this.exps_list[status_bar_index];

            if( typeof( exp_obj ) == "undefined" || exp_obj == null )
            {
                dump('  **failed** to get exp obj for index:' + status_bar_index);
                return;
            }

            this.hide_experiment( exp_obj.tla, true );
        }
        catch(e)
        {
            dump('**exception** on menu hide experiment:\n' + e + '\n');
        }
    },

    onMenuGetOmniture: function()
    {
        try
        {
            // this approach depends on the browser window being active
            // in contrast with the config page being active
            var url = window.content.document.URL;

            active_page_abacus.discover_html_content();


            var url_latest = active_page_abacus.latest_url;
            var om_tags = active_page_abacus.get_omniture_hash( url_latest );

            dump('on menu get omniture : url latest = ' + url_latest + '\n');

            for( var tag in om_tags )
            {
                dump( tag + ' = ' + om_tags[tag] + '\n' );
            }
        }
        catch(e)
        {
            alert('on menu get omniture\n' + e);
        }
    },

    // something has triggered the need to detect buckets
    // read the preference to know how the value is read
    // html = parse current page html code looking for experiment stuff
    // omniture = catch omniture image request.
    // * javascript = read javascript values for tealeaf tracking
    // ** url = talk with back end, fire off an https request
    //
    // todo: where are experiments arranged?

    updateBuckets: function()
    {
        try
        {
            var get_pref_omn = InstaBucket.get_is_detect_bucket_via_omniture();
            var get_pref_htm = InstaBucket.get_is_detect_bucket_via_html();
            var group_pref = false;

            if( InstaBucket.get_is_detect_bucket_via_html() )
            {
//                 if( active_page_abacus.discover_html_content( ) )
                if( true )
                {
                    dump('update buckets found content via discover_html_content\n');

                    // calls to add experiments for view done in prioritize_experiments
//                     override_group_pref = this.get_show_experiments_based_on_html_content();

//                     dump('pref to override group pref: ' + override_group_pref + '\n');

//                     // todo: move this to update status bar.
//                     if( override_group_pref )
//                     {
//                         this.update_group_html();
//                     }

                    this.update_buckets_html();
                }
            }
//             else
//             {
//                 // extra sure to avoid calling this.
//                 dump('************************************\n');
//                 dump('calling update buckets url          \n');
//                 dump('from updateBuckets                  \n');
//                 dump('************************************\n');
//                 // this will talk with an https page
//                 // which gets the bucket values
//                 // but it gives warning dialogs.
//                 this.update_buckets_url();
//                 return;
//             }

            // done in prioritize_experiments
//             InstaBucket.update_group_abacus();

//             InstaBucket.inject_mvc_if_needed();

//             InstaBucket.update_buckets_abacus();

            InstaBucket.update_buckets_omniture();
        }
        catch(e)
        {
            alert('update buckets:\n' + e);
        }
    },

    // when a url request goes out, which has omniture stuff
    // experiment stuff is pulled out, and this method is called
    // for each experiment found.
    on_omniture_url_exp_bucket: function( id, bucket, page_url )
    {
        try
        {
            // todo: store omniture stack by domain.
            this.omniture_stack.add_id( id, bucket );

            InstaBucket.update_last_pos_from_exp_id( id );
        }
        catch(e)
        {
            dump('on omniture url exp bucket:\n' + e + '\n');
        }
    },

    // set bucket values based on omniture traffic
    update_buckets_omniture: function()
    {
        try
        {
            dump('>>>>>>>>>> update buckets omniture\n');

            // copy the experiments from recent to exps_list

            // todo: keep a more permanent library of experiment guys
            // pull the needed item, rather than creating a new one.
            // update the experiment bucket stuff

            var count = this.exps_list.length;
            for( var i = 0 ; i < count ; i ++)
            {
                var ex = this.exps_list[ i ];
                var pos = this.get_pos();
                var id = ex.get_pos_id( pos );

                var bucket = omniture_buckets.get_bucket( id );

                dump('  ubo : pos ' + InstaBucket.get_pos() + ' exp id : ' + i +
                        ' = ' + id + ', bk = ' + bucket + '\n');

                if( bucket < 0 )
                {
                    dump('   ubo : negative bucket, do not set bucket\n');
                }
                else
                {
                    ex.bucket = bucket;
                }
            }
        }
        catch(e)
        {
            dump('update buckets omniture:\n' + e + '\n');
        }
    },

    // if mvc is one of the items in the user's group
    // and the current POS matches any pos for the exp
    // then push mvc as position first.
    //
    // mvc has been added as an omniture supported experiment.
    inject_mvc_if_needed: function()
    {
        try
        {
            return;

//             dump('*\n*\n* inject mvc if needed \n*\n*\n');
            var pos = InstaBucket.get_pos();
            if( pos.indexOf( 'US' ) < 0 &&
                pos.indexOf( 'DE' ) < 0 )
            {
                dump('did not find pos us or de in: ' + pos + '\n');
                return;
            }
//             dump('found pos us or de in: ' + pos + '\n');

            var on_infosite_page = false;

            var exp_tla = 'HIMVC';
            // get ID from pos and experiment TLA
            var exp_id = recent_experiments.lookup_id_from_tla( exp_tla );
            var exp_bucket = 0;

//             dump('\n\n himvc, id:' + exp_id + '\n\n');

            if( exp_id > -1 )
            {
                var html = active_page_abacus.get_page_inner_html();
                dump('length of html = ' + html.length + '\n' );
                if( html.length > 500 )
                {
                    // I would prefer to search for the text:
                    // <!-- rendered by MVC -->
                    // however, innerHtml has comments and other stuff missing.

                    // as a hack work around, this text is appearing in Non MVC:
                    // YAHOO.namespace("cx.expedia.page.hotel.spotlight");

//                     var mvc_on_searchTag = '<!-- rendered by MVC -->'; // if found, then MVC is ON.

                    var infosite_page_search_tag = '<input id="pageId" value="page.Hotels.Infosite.Information"';
                    var on_infosite_page_tag_index = html.indexOf(infosite_page_search_tag);
                    if( on_infosite_page_tag_index > 0 )
                    {
                        on_infosite_page = true;
                    }

                    if( on_infosite_page )
                    {
                        var mvc_off_search_Tag = 'YAHOO.namespace("cx.expedia.page.hotel.spotlight");';

                        var non_Mvc_Tag_Index = html.indexOf(mvc_off_search_Tag);

                        if( non_Mvc_Tag_Index > 0 )
                        {
    //                         dump('\n\n        found: ' + mvc_off_search_Tag + '\n  mvc is off\n\n');
                            exp_bucket = 0;
                        }
                        else
                        {
    //                         dump('\n\n did not find: ' + mvc_off_search_Tag + '\n  mvc is on\n\n');
                            exp_bucket = 1;
                        }
                    }
                }

                if( on_infosite_page )
                {

                    // active_page_abacus
                    // this.add( exp_id, exp_bucket, 'mvc infosite' );

    //                 dump('adding to omniture stack id:' + exp_id + ', bucket:' + exp_bucket + '\n');
                    this.omniture_stack.add_id( exp_id, exp_bucket );

                    dump('adding MVC to html buckets, id:' + exp_id + ', bucket:' + exp_bucket + '\n');
                    html_buckets.set_bucket( exp_id, exp_bucket );
                    omniture_buckets.set_bucket( exp_id, exp_bucket );
                }
            }
        }
        catch(e)
        {
            dump('inject mvc if needed:\n' + e + '\n');
        }
    },


    update_buckets_omniture_old: function()
    {
        try
        {
            dump('>>>>>>>>>> update buckets omniture\n');
            var exp_count = this.exps_list.length;
            for( var exp_index = 0 ; exp_index < exp_count ; exp_index++ )
            {
                var ex = this.exps_list[ exp_index ];
                ex.bucket = -1;
            }

            var current_url = InstaBucket.get_current_url( );
            exp_hash = bucket_hash.get_exp_hash( current_url );
            dump('exp hash count: ' + exp_hash.length + '\n');

            for( var id in exp_hash )
            {
                var bucket = exp_hash[id];

                // now that we have the experiment id, and the bucket
                // see if we already have this experiment, if yet, set the bucket.
                var found_experiment_showing = false;

                var exp_count = this.exps_list.length;

                for( var exp_index = 0 ; exp_index < exp_count ; exp_index++ )
                {
                    var ex = this.exps_list[ exp_index ];
                    var showing_id = -1;
                    try
                    {
                        showing_id = ex.get_pos_id( InstaBucket.get_pos() );
                    }
                    catch(e){}
                    found_experiment_showing = ( id == showing_id );
                    if( found_experiment_showing )
                    {
                        ex.bucket = bucket;
                        break;
                    }
                }

                if( !found_experiment_showing )
                {
                    // we do not have the expierment showing, bring it in.
                    var full_exp = this.find_exp_with_id( id );
                    full_exp.bucket = bucket;
                    this.exps_list.push( full_exp );
                }
            }
            // while there are more than 6, remove the one with no bucket value
            // then remove the lowest ids.
            while( this.exps_list.length > 6 )
            {
                break;

            }

        }
        catch(e)
        {
            dump('update buckets omniture:\n' + e);
        }
    },

    update_group_html___zzzz_remove_zzzz: function()
    {
        try
        {
            dump('enter update group html : ');
            // create a new group for dynamic content
            //   name it current_name + html_items
            // copy out current experiments from current group
            //   only if they match the current point of sale.
            // find new experiments not in current group
            // prepend experiments into group based on current page
            // some experiments may drop off the end.
            // order experiments within the group descending based on ID

            var current_group = '';
            var html_experiments = '';

            // copied from pref_groups.js
            var active_group_name = InstaBucket.get_active_group_name();
//             var new_group_name = active_group_name + 'html_update';

            // using the current group isn't so good
            // better to use the visible experiments.
//             var current_tlas = InstaBucket.load_group_exp_tla_names( active_group_name );
            var pos = InstaBucket.get_pos();

            dump('enter update group html, pos = ' + pos + '\n');

            var current_tlas = new Array;

            var exp_count = this.exps_list.length;
//             dump(' adding tla to the current_tlas list, count: ' + exp_count + '\n' );
            for( var exp_index = 0 ; exp_index < exp_count ; exp_index++ )
            {
                var ex = this.exps_list[ exp_index ];

                var ex_tla = ex.tla;
//                 dump(' adding tla to the current_tlas list: ' + ex_tla + '\n' );
                current_tlas.push( ex_tla );
            }

            for( var ab_ex_id in active_page_abacus.experiments )
            {
                var tla_c = current_tlas.length;
//                 dump( 'count: ' + tla_c + '  ' );
                for( var tla_index in tla_c )
                {
                    var tla = current_tlas[ tla_index ];
                    dump( tla + ' ' );
                }

                var ab_ex = active_page_abacus.experiments[ ab_ex_id ];

//                 dump('ab_ex_id = ' + ab_ex_id + ', ab_ex tla = ' + ab_ex.tla + '\n' );
                var id = ab_ex.id;
                var bucket = ab_ex.bucket;

                // todo: performance
                // this might be slow, as all experiments are loaded each time.
                // may be better to pass in an array of ids to be looked up.
                var ab_full_exp = this.find_exp_with_id( id );
                if( !ab_full_exp )
                {
//                     dump( 'not able to get full experiment for id: ' + id + '\n' );
                    continue;
                }

                var tla = ab_full_exp.tla;
                var id_for_pos = ab_full_exp.id_pos[ pos ];
                if( !id_for_pos || id_for_pos < 0 )
                {
                    continue;
                }

//                 dump( 'found html experment for id: ' + id + ' and pos: ' + pos + 'with tla: ' + tla + '\n' );

                // see if the tla for web page ids is already in there in the group of tlas
                // http://answers.yahoo.com/question/index?qid=20080229041323AAAv6zu

                if( (current_tlas.join("") ).indexOf( tla ) >= 0)
                {
//                     dump( 'tla ' + tla + ' is already in the saved group.\n' );
                    continue;
                }

//                 dump( 'tla not in group, prepending: ' + tla + '\n' );
                current_tlas.unshift( tla );

                // create an experiment, prepend to array of experiments
                // these are the guys used to display stuff in the status bar.
                var exp_pref = InstaBucket.load_exp_pref_tla( tla );
                if( null != exp_pref )
                {
                    dump('poiuy loaded tla: ' + tla + ' exp loaded: ' + exp_pref + '  id:' + exp_pref.full_name + '\n' );
                    exp_pref.bucket = bucket;
                    this.exps_list.unshift( exp_pref );
                }

            }


            // sorting doesn't seem to do anything.
            var sorted_exps_list = this.exps_list.sort( InstaBucket.sort_exp_by_id );
            dump('j');

            this.exps_list = sorted_exps_list;

            // try popping off experiments that have no id, and put them on the end.

            var do_not_use_this = false;
            var more_to_do = true;
            var max_try_safety = 50;
            while( do_not_use_this && more_to_do && max_try_safety-- > 0 )
            {
                dump('ids to display: ' );
                var comma = '';
                var exp_i = this.exps_list.length;
                for( var i = 0 ; i < exp_i ; i ++ )
                {
                    var ex_view = this.exps_list[ i ];
                    if( !ex_view ) continue;
                    dump(' ex_view has value of: ' + ex_view + '\n' );
                    try
                    {
                        var id = ex_view.get_pos_id( InstaBucket.get_pos() );
                    }
                    catch(e)
                    {
                        dump('exception with i = ' + i + ' \n');
                        dump('exception with get_pos_id : \n' + e);
                        for( var e in ex_view )
                        {
                            dump( e + ' = ' + ex_view[e] + '\n' );
                        }
                    }

                    dump( comma + id );
                    comma = ', ';
                }
                dump( '\n' );


                // keep looping if a positive id is found after a negative one.
                var found_negative_id = false;
                more_to_do = false;

                var exp_count = this.exps_list.length;

                // -1, as we don't need to check the last one.
                for( var exp_index = 0 ; exp_index < exp_count-1 ; exp_index++ )
                {
                    var ex_splice = this.exps_list[ exp_index ]
                    var current_id;
                    try
                    {
                        current_id = ex_splice.get_pos_id( InstaBucket.get_pos() );
                    }
                    catch(e)
                    {
                        dump('exception with exp_index = ' + exp_index + '\n' );
                        dump('exception trying to get pos id:\n' + e);

                        dump( 'ex_splice = ' + ex_splice + '\n' );
                        for( var ex in ex_splice )
                        {
                            dump( ex + ' = ' + ex_splice[ex] + '\n' );
                        }
                    }
                    if( current_id > 0 && found_negative_id )
                    {
                        more_to_do = true;
                        break;
                    }

                    if( current_id < 0 )
                    {
                        found_negative_id = true;
                        // remove the item with a negative id.
                        var removed_exp = this.exps_list[ exp_index ];
                        this.exps_list.splice( exp_index, 1 );
                        this.exps_list.push( removed_exp );
                        more_to_do = true;
                        break;
                    }
                }
            }



            // update screen with newly formed group of tlas.
            // hopefully the caller will show our new save name.
            // this.updateStatusBar();

            // we have some optionts:
            // save what we found under a savename
            // then load that savename.

            // or directly set what tlas to use on the screen
            // this would bypass the savename stuff

//             updateStatusBar reads from this array
//             var exp_pref_bucket_obj = this.exps_list[i];
//             so change that directly.

        }
        catch(e)
        {
            alert('update group html:\n' + e);
        }
    },

    sort_exp_by_id: function( exp_a, exp_b )
    {
        var a_id;
        var b_id;

        // no id for this pos will give -1
        a_id = exp_a.get_pos_id( InstaBucket.get_pos() );
        b_id = exp_b.get_pos_id( InstaBucket.get_pos() );

        // reverse sort, largest come first
        return b_id - a_id;
    },

    // parse the current web page
    // grab all the experiment ids and their buckets
    // then go through all the currently showing experiments
    // set their bucket, based on the current point of sale.
    //
    // in the future we may want to change what experiments
    // are shown, based on what is parsed from the html.
    // to support this, keep the html parsing code in a method of its own.
    //
    update_buckets_html: function()
    {
        var step = 'a';
        try
        {
            dump('>>>>>>>>>> update buckets html >>\n');

//             dump_exps( 'update buckets html enter' );

            // the caller of update_buckets_html
            // must first call this, to parse the html:
            // active_page_abacus.discover_html_content( );

            for(i = 0 ; i < 20 ; i++)
            {
                step = 'b' + i;
                var exp_b_h = this.exps_list[i];

                if( exp_b_h == null )
                    continue;
                dump(' i = ' + i + ', exp b h = <' + exp_b_h + '>\n');

                var id = exp_b_h.get_pos_id( InstaBucket.get_pos() );

                step = 'c' + i;
                var bucket = active_page_abacus.get_bucket( id );

                step = 'd' + i;
                dump('  ubh : pos ' + InstaBucket.get_pos() + ' exp id ' + i +
                        ' = ' + id + ', bucket = ' + bucket + '\n');

                step = 'e' + i;
                if( bucket < 0 )
                {
                    dump('   ubh : negative bucket, do not set bucket\n');
                }
                else
                {
                    this.exps_list[i].set_bucket( bucket );
                    step = 'f' + i;
                }
            }

            dump('-- show exps --  update buckets html\n');
            for( var i = 0 ; i < this.exps_list.length ; i ++)
            {
                step = 'g' + i;
                var expr = this.exps_list[i];
                step = 'h' + i;
                var id = expr.get_pos_id( InstaBucket.get_pos() );
                step = 'i' + i;
                var bucket = expr.bucket;

                dump('  ' + id + ' : ' + bucket + '\n');

            }
            dump('<<< ending <<< update buckets html\n');
        }
        catch(e)
        {
            alert('update buckets html step<' + step + '>:\n' + e);
        }


    },

    // see prioritize_experiments
    // InstaBucket.prioritize_add_omniture_experiments();
    update_group_abacus: function()
    {
        // todo move things around, get abacus stuff showing.
        // load up the experiment acronyms
        // based on the experiments found via omniture.


    },

    update_buckets_abacus: function()
    {
        try
        {
            dump('>>>>>>>>>> update buckets abacus\n');

            // the caller of update_buckets_abacus
            // must have things populated in bucket_capture.js

            for(i = 0 ; i < 20 ; i++)
            {
                var exp_b_h = this.exps_list[i];

                if( exp_b_h == null )
                    continue;

                var id = exp_b_h.get_pos_id( InstaBucket.get_pos() );

                // var bucket = active_page_abacus.get_bucket( id );
                var bucket = omniture_buckets.get_bucket( id );

                dump('  uba : pos ' + InstaBucket.get_pos() + ' exp id : ' + i +
                        ' = ' + id + ', bk = ' + bucket + '\n');

                if( bucket < 0 )
                {
                    dump('   uba : negative bucket, do not set bucket\n');
                }
                else
                {
                    this.exps_list[i].set_bucket( bucket );
                }
            }

            var omniture_key = omniture_buckets.validate_key();
            dump('uba omniture key: ' + omniture_key + '\n' );
        }
        catch(e)
        {
            dump('update buckets abacus:\n' + e + '\n');
        }


    },


    update_buckets_url: function()
    {
        var i;
        var step = 'a';
        var undef = 0;

        // todo: change to just update what is visible.
        // todo: how to store bucket information?

        // uk and ca have different ids
        // other pos show grey area.
        var pos;
        try
        {
            step = 'b';
            for(i = 0 ; i < 20 ; i++)
            {
                var exp_b_h = this.exps_list[i];

                if( exp_b_h == null )
                    continue;

                this.exps_list[i].set_bucket( '-' );

                step = 'c';

                var id = -1;

                if( g_testing )
                    id = exp_b_h.get_pos_id( 'US');
                else
                    id = exp_b_h.get_pos_id( InstaBucket.get_pos() );

                step = 'd';
                    // -1 = secret code to remove item.

                if( "undefined" == typeof( id ) || id <= 0 )
                {
                    exp_b_h.set_tla( '-' );
                    exp_b_h.set_bucket( '' );
                    continue;
                }
                else
                {
                    var useAsyncCalls = false;
                    if( useAsyncCalls )
                    {
                        // todo: fix async calls.
                        // maybe send one at a time.

                        this.exps_list[i].set_bucket( '-' );
                        var callback = this.set_bucket_value;

                        ExpWebReader.get_experiment_async( id, callback );
                    }
                    else
                    {
                        var max_try = 10;
                        var e = null;
                        while( max_try-- > 0 )
                        {
                            if( !g_testing )
                            {
                                e = ExpWebReader.get_experiment( id );
                            }
                            if( null == e || "undefined" == typeof(e) || e.id == id )
                            {
                                if( null == e )
                                {
                                    dump('experiment came back as null, bail out\n');
                                }
                                else
                                {
                                    dump('got experiment, id: ' + e.id + ' with bucket: ' + e.bucket + '\n');
                                }
                                break;
                            }
                            // usually one retry per batch of 5 requests.
                            // alert("asked for id: " + id + " got back id: " + e.id );
                        }

                        step = 'f';
                        if( null == e )
                        {
//                             // alert('index: ' + i + ' set to -');
//                             alert(' please select:\n\n' +
//                                 'I understand the risks,\n' +
//                                 'Add Exception,\n' +
//                                 'Confirm Security Exception\n\n' +
//                                 'To avoid this error in the future.' );

                            this.exps_list[i].set_bucket( '-' );

                            dump('got back null result on id: ' + id + ', bail out\n');

                            // only fail once
                            break;
                        }
                        else
                        {
                            this.exps_list[i].set_bucket( e.bucket );
    //                         alert('set bucket to ' + e.bucket +
    //                                 '\n' + this.exps_list[i].dump() );
                        }
                    }
                }
            }
        }
        catch(e)
        {
            // todo: get things lined up
            // todo: catch errors better.

            if( g_tracing ) alert("update buckets i=" + i + " step=" + step + ":\n" + e);
            else alert("update buckets i=" + i + " step=" + step + ":\n" + e);

            // step e, e is undefined. ( experiment back from web )
            // todo: show dash when it comes back as undefined
        }
    },

    set_bucket_value: function( id, bucket )
    {
        try
        {
            var fixed_some = false;

            for( var i in this.exps_list )
            {
                if( this.exps_list[i].id == id )
                {
                    fixed_some = true;
                    this.exps_list[i].set_bucket( bucket );
                }
            }

            if( fixed_some )
            {
                updateStatusBar();
            }
        }
        catch(e)
        {
            alert('set bucket value:\n' + e);
        }
    },

    // this might work, but we need more details.
//     open_popup: function(event)
//     {
//         try
//         {
//             // alert('event.target.id = ' + event.target.id);

//             var id_len = event.target.id.length;

//             if( 'insta-bucket-' != event.target.id.substr( 0, id_len-1 ) )
//                 return;

//             // don't show the normal context menu.
//             event.preventDefault();

//             var panel_id = event.target.id;
//             var index = panel_id.substr( panel_id.length-1 );

//             // show menu, get reply, apply to this index.
//             // https://developer.mozilla.org/en/XUL/menupopup

//             var menuPopup = document.getElementById('bucket-context-menu');
//             menuPopup.openPopup(null, 'after_pointer', 0, 0, true);
//         }
//         catch(e)
//         {
//             alert('open popup:\n' + e);
//         }
//     },

//     appendStatusBarItem: function(index)
//     {
//         return;

//         try
//         {
//             // alert("append status bar item: " + index );

//             var statusBar = document.getElementById('status-bar');
//             var panel = document.createElement("statusbarpane");
//             var added = statusBar.appendChild(panel);
//             added.label = 'namez' + index;
//             added.value = 'valuez' + index;

//             added.id = 'menu-item-added' + index;
// //             added.id = 'previously-added' + index;
// //             added.addEventListener("contextmenu", this.open_popup, true);

//             return added;
//         }
//         catch(e)
//         {
//             alert("append status bar item:\n" + e);
//         }

/*
            var popupset = document.createElement("popupset");
            var popupElement = document.createElement("popupmmmmmmmm");
            var popup = popupset.appendChild(popupElement);

            var item = popup.appendItem( 'Refresh Now', 'refresh_id' );
            item.default = "true";
            item.oncommand = "InstaBucket.refresh_buckets()";

            var item = popup.appendItem( 'Remove', 'remove' );
            item.default = "true";
            item.oncommand = "InstaBucket.removeMenu(" + index + ")";

            var item = popup.appendItem( 'Insert', 'insert' );
            item.default = "true";
            item.oncommand = "InstaBucket.insertMenu(" + index + ")";

            var item = popup.appendItem( 'Remove', 'remove' );
            item.default = "true";
            item.oncommand = "InstaBucket.removeMenu(" + index + ")";

            // todo: add separator menu item
            popup.appendItem( '------', 'separator');

            var item = popup.appendItem( 'Trip Advisor', '' );
            item.oncommand = "InstaBucket.watchExp(" + index + "'1044', 'TRIP'" ;

            var item = popup.appendItem( 'More Photos', '' );
            item.oncommand = "InstaBucket.watchExp(" + index + "'1078', 'PHOTO'" ;

            var item = popup.appendItem( 'Book now Overlay', '' );
            item.oncommand = "InstaBucket.watchExp(" + index + "'1062', 'BOOK'" ;

            var item = popup.appendItem( 'DRR Messaging', '' );
            item.oncommand = "InstaBucket.watchExp(" + index + "'1066', 'DRR'" ;

            var item = popup.appendItem( 'Videos', '' );
            item.oncommand = "InstaBucket.watchExp(" + index + "'1111', 'VIDEO'" ;

            var item = popup.appendItem( 'Book Prices', '' );
            item.oncommand = "InstaBucket.watchExp(" + index + "'1122', 'PRICE'" ;
            */

/*

  <popupset>
    <popup id="bucketmenu2" position="after_start">
      <menuitem label="Refresh Now"  default="true"
          oncommand="InstaBucket.refresh_buckets()"/>
      <menuseparator/>
      <menuitem label="Trip Advisor" oncommand="InstaBucket.watchExp(2, '1044','TRIP')"/>
      <menuitem label="More Photos" oncommand="InstaBucket.watchExp(2, '1078','PHOTO')"/>
      <menuitem label="Book now Overlays" oncommand="InstaBucket.watchExp(2, '1062','BOOK')"/>
      <menuitem label="DRR Messaging" oncommand="InstaBucket.watchExp(2, '1066','DRR')"/>
      <menuitem label="Videos" oncommand="InstaBucket.watchExp(2, '1111','VIDEO')"/>
      <menuitem label="Book Prices" oncommand="InstaBucket.watchExp(2, '1122','PRICE')"/>
    </popup>
  </popupset>

*/
//     },

//     onMenuRemove: function(event)
//     {
//         try
//         {
//             var nodeId = document.popupNode.id;
//             var id_len = nodeId.length;
//             var status_bar_index = nodeId.substr( id_len-1 );


//             var save_name_id = 'experiment' + status_bar_index + '.id';
//             var save_name_tla = 'experiment' + status_bar_index + '.tla';
//             var save_name_full = 'experiment' + status_bar_index + '.full';

//             // triggers an observe

//             this.prefs.setCharPref(save_name_id, '-1');
//             this.prefs.setCharPref(save_name_tla, '-');

//             this.refresh_buckets();


// //             alert('to be done, index:' + status_bar_index);
// //             return;

// //             alert('popup node id: ' + document.popupNode.id);
// //             alert('this.id = ' + this.id);
// //             alert('event.target.localName = ' + event.target.localName);
//         }
//         catch(e)
//         {
//             alert('remove menu:\n' + e);
//         }
//     },

    onMenuForceRefresh: function()
    {
        this.prioritize_experiments();
        this.refresh_buckets( true );
    },

    // todo: how to make this modal?
    onMenuPrefs: function()
    {
        try
        {
            if( this.g_options_window == null ||
                typeof( this.g_options_window ) == "undefined" ||
                this.g_options_window.closed )
            {
//                 alert( 'open : g options window = ' + this.g_options_window );

                // todo: center the window

                // https://developer.mozilla.org/en/Working_with_windows_in_chrome_code
                 this.g_options_window = window.open("chrome://instabucket/content/options.xul",
                               "optionsForInstabucket", "chrome,centerscreen,toolbar");
//                  this.g_options_window = window.openDialog("chrome://instabucket/content/options.xul",
//                                "optionsForInstabucket", "chrome,centerscreen,toolbar");
            }
            else
            {
//                 alert( 'focus : g options window = ' + this.g_options_window );
                this.g_options_window.focus();
            }

            // maybe we can send a message to load prefs
            // this calls up a dialog before the window is shown.
            // alert( 'after open window' );
        }
        catch(e)
        {
            alert('on menu prefs:\n' + e)
        }
    },

    pull_file_contents: function( filename )
    {
        var content = '';

        try
        {
            var httpRequest;

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

            // if true ( async calls ) then side bar gets no info back.
            var async = false;
            httpRequest.open('GET', filename, async);
            try
            {
                httpRequest.send(null);
            }
            catch(e)
            {
                alert('http request send:\n' + e);
                // todo: better error handling.
            }

//             if( g_tracing ) dump( 'response text:\n' + httpRequest.responseText );

            content = httpRequest.responseText;

            // todo: parse contaent, populate experiment details.
        }
        catch(e)
        {
        }


        return content;
    },


    is_point_of_sale: function( pos_text )
    {
        try
        {
            if( pos_text.toUpperCase() != pos_text )
            {
//                 if( g_tracing )
//                     dump( pos_text.toUpperCase() + ' != ' + pos_text + ', it is not upper case, not a point of sale.' );
                return false;
            }
            var number_regex = /\d/;
            var number_result = number_regex.exec( pos_text );

            if( null != number_result )
            {
//                 if( g_tracing )
//                     dump( pos_text + ' is a number, not a point of sale.' );
                return false;
            }

            if( pos_text == 'AP' || pos_text == 'AC' )
            {
//                 if( g_tracing )
//                     dump( pos_text + ' is part of APAC, not a point of sale.' );
                return false;
            }
        }
        catch(e)
        {
            alert('is point of sale:\n' + e);
        }
        return true;
    },
/*

    <tr class="dark clickable" onclick="displayInstances()">
        <td>1137</td>
        <td>05/13/11</td>
        <td>pqiu</td>
        <td>DDRHotelSearchResultsUK</td>
        <td><a href="experiment.aspx?experiment=1137" onclick="event.cancelBubble = true">view / edit</a></td>
    </tr>
    <tr class="dark hidden">
        <td>&nbsp;</td>
        <td colspan="2">Throttling 100% to setup</td>
        <td colspan="3">&nbsp;&nbsp;&nbsp;&nbsp;05/23/11 11:18 AM - 06/06/76 12:00 AM - Running &nbsp;&nbsp;<a href="results.aspx?instance=5000">View Results</a></td>
    </tr>
    <tr class="clickable" onclick="displayInstances()">
        <td>1136</td>
        <td>05/13/11</td>
        <td>pqiu</td>
        <td>DDRHotelSearchResultsCA</td>
        <td><a href="experiment.aspx?experiment=1136" onclick="event.cancelBubble = true">view / edit</a></td>
    </tr>

    work with stuff between these guys:

        "displayInstances()"
*/
    parse_abacus_page: function( content )
    {
        var results = null;
        var pull_only_running = false;

        try
        {
            dump('**** parsing config file, pause everything else ****\n');
            disable_pref_monitoring(30000);

            // this approach was failing.
            // disconnect_event_listeners();

            results = new Array();

            var active_only = true;

            // if( g_tracing ) dump( content );

            // this guy works with the page saved as html
            // var exp_big_regex = /<tr class=[^>]+>([\s\S]+?)<a href=/ig;

            // this works for getting the pos experiment id
            // however it misses on the date and status stuff Running / Incomplete / Complete
            // var exp_big_regex = /<tr[\s\S]*?<\/tr>/ig;

            // this may miss the last one, seems ok.
            // (?!dontmatchthis) = do not match the thing in the parenthesis.
            // this skips every other one.  better to use 'split'
            // var exp_big_regex = /\"displayInstances[\s\S]*?\"displayInstances/ig;

            // split seems slow, but it works
            // todo: get this code running in the background
            // on reaction to an async call.
//             var exp_chunks_array = content.split( /displayInstances/ );
//             for( var ecai = 0 ; ecai < exp_chunks_array.length ; ecai++ )
//                 var exp_raw = exp_chunks_array[ecai];


            // this works for getting everything
            // however it appears to be even slower than split.
//             var exp_big_regex = /displayInstances[\s\S]*?clickable/ig;
//             var max_big_exp = 5000;
//             while( max_big_exp-- > 0 )
//                 var exp_big_match = exp_big_regex.exec( content );
//                 if( exp_big_match == null )
//                     break;
//                 var exp_raw = exp_big_match[0];

            var exp_chunks_array = content.split( /displayInstances/ );
            for( var ecai = 0 ; ecai < exp_chunks_array.length ; ecai++ )
            {
//                 if( ecai > 20 )
//                     break;

                var exp_raw = exp_chunks_array[ecai];

                // for items not being found, to debug.

//                  var find_it = /OneWayFlightsOnE3UK/;
//                  var found_it = find_it.exec( exp_raw );
//                  if( found_it == null )
//                      continue;


                var exp_pull_regex = /<td>(\d+)<\/td>[^<]*?<td>([^<]+)<\/td>[^<]*?<td>([^<]+)<\/td>[^<]*?<td>(..)([^<]+)(..)<\/td>[^<]*?/;
                var exp_pull_match = exp_pull_regex.exec( exp_raw );


                if( exp_pull_match == null )
                {
//                     if( g_tracing )
//                         dump('found no exp details in:\n' + exp_raw);
                    // alert('found no exp details in:\n' + exp_raw);
                    continue;
                }

                var abacus_details = '';

                var experiment_id = exp_pull_match[1];
                var experiment_create_date = exp_pull_match[2];
                var experiment_owner = exp_pull_match[3];
                var experiment_pos_pre = exp_pull_match[4];
                var experiment_name = exp_pull_match[5];
                var experiment_pos_post = exp_pull_match[6];

                abacus_details = experiment_id + ":" + experiment_pos_pre + experiment_name + experiment_pos_post;
                abacus_details += '\n   created:' + experiment_create_date +
                                    '\n   owner: ' + experiment_owner + '\n';

                var experiment_pos = '';

                if( g_tracing )
                    dump( ' pre: ' + experiment_pos_pre +
                            ' name: ' + experiment_name +
                            ' post: ' + experiment_pos_post );

                if( this.is_point_of_sale( experiment_pos_pre ) &&
                    !this.is_point_of_sale( experiment_pos_post ) )
                {
                    experiment_name += experiment_pos_post;
                    experiment_pos = experiment_pos_pre;
                }

                if( this.is_point_of_sale( experiment_pos_post ) )
                {
                    experiment_name = experiment_pos_pre + experiment_name;
                    experiment_pos = experiment_pos_post;
                }

                if( experiment_pos.length < 1 )
                {
                    experiment_name = experiment_pos_pre + experiment_name + experiment_pos_post;
                    experiment_pos = 'US';
                }

//                 alert(  'found id: ' + experiment_id +
//                         '\n  name: ' + experiment_name +
//                         '\n   pos: ' + experiment_pos );

                // now that we've loaded the information
                // let's see if we want to keep it.

                /*
                    <tr class="dark hidden">
                        <td>&nbsp;</td>
                        <td colspan="2">Throttled 100/0/0 for dev</td>
                        <td colspan="3">&nbsp;&nbsp;&nbsp;&nbsp;01/06/05 12:37 PM - 06/06/76 12:00 AM - Incomplete (aborted 01/06/05) &nbsp;&nbsp;<a href="results.aspx?instance=1">View Results</a></td>
                    </tr>

                    <td colspan="3">&nbsp;&nbsp;&nbsp;&nbsp;04/29/11 11:53 AM - 06/06/76 12:00 AM - Incomplete (aborted 05/11/11) &nbsp;&nbsp;<a href="results.aspx?instance=4840">View Results</a></td>
                    <td colspan="3">&nbsp;&nbsp;&nbsp;&nbsp;05/11/11 11:00 AM - 05/23/11 02:00 PM - Complete &nbsp;&nbsp;<a href="results.aspx?instance=4912">View Results</a></td>
                    <td colspan="3">&nbsp;&nbsp;&nbsp;&nbsp;06/01/11 10:11 AM - 06/06/76 12:00 AM - Running &nbsp;&nbsp;<a href="results.aspx?instance=5048">View Results</a></td>
                    <td colspan="3">&nbsp;&nbsp;&nbsp;&nbsp;08/12/10 04:14 PM - 08/12/10 04:14 PM - Ready for Scheduling &nbsp;&nbsp;<a href="results.aspx?instance=3244">View Results</a></td>

                */

                // first slice it into parts, to help regex search less each time.
                var status_chunks = exp_raw.split( /<tr/ );

                var status_pull_regex = /<td colspan="2">([\s\S]*?)<\/td>[\s\S]*?<td colspan="3">[\s\S]*?(\d\d\/\d\d\/\d\d)[\s\S]*?(\d\d\/\d\d\/\d\d)[\s\S]*?(Incomplete|Complete|Running|Ready for Scheduling)/g;
                var status_pull_match = null;

//                 for( var i = 0 ; i < status_chunks.length ; i ++)
//                 {
//                     alert( i + ' = ' + status_chunks[i] );
//                 }

                // starting at the tail end, use the first one that matches.

                for( var sc = status_chunks.length-1 ; sc > -1 ; sc-- )
                {
                    var text = status_chunks[ sc ];
                    status_pull_match = status_pull_regex.exec( text );

                    if( null != status_pull_match )
                    {
//                         alert('found non null');
                        break;
                    }
                }

                var status_message = '';
                var status_date_begin = '';
                var status_date_end = '';
                var status_word = '';

//                 alert( ' status pull match = ' + status_pull_match );

                if( null != status_pull_match )
                {
                    status_message = status_pull_match[1];
                    status_date_begin = status_pull_match[2];
                    status_date_end = status_pull_match[3];
                    status_word = status_pull_match[4];

                    status_message = status_message.replace( /&nbsp;/g, '' )
                    status_message = status_message.replace( /^\s/g, '' )
                    status_message = status_message.replace( /\s$/g, '' )
                }

                abacus_details += '  ' + status_word + '  ' + status_date_begin + '  ' + status_date_end;
                if( status_message.length > 0 )
                {
                    abacus_details += '\n  ' + status_message;
                }

                if( g_tracing )
                    dump( 'abacus details: ' + abacus_details );

                if( pull_only_running && status_word != 'Running' )
                {
                    if( g_tracing )
                    {
                        dump ('found status word: ' + status_word +
                            ' != Running, skipping experiment: ' + experiment_name );
                    }
                    else
                    {
//                         alert('found status word: ' + status_word +
//                             '\nso, skipping experiment: ' + experiment_name );
                    }
                    // do not save this experiment
                    continue;
                }


                var loaded_exp = null

                if( typeof( results[ experiment_name ] ) == "undefined" )
                {
                    loaded_exp = new exp_pref_bucket();
                    results[ experiment_name ] = loaded_exp;

                    var tla = '';
                    var exp_pull_caps_regex = /[A-Z]/g;
                    var max_caps = 10;
                    while( max_caps-- > 0 )
                    {
                        var exp_pull_caps_match = exp_pull_caps_regex.exec( experiment_name );
                        if( exp_pull_caps_match == null )
                            break;

                        tla += exp_pull_caps_match[0];
                    }

                    loaded_exp.tla = tla;
                    loaded_exp.full_name = experiment_name;
                    loaded_exp.description = 'experiment loaded from abacus web page';

                    loaded_exp.set_bucket_name( 0, 'control' );
                    loaded_exp.set_bucket_name( 1, 'on' );

//                     alert( 'created new experiment:\n' + loaded_exp.dump() );
                }
                else
                {
//                     if( g_tracing ) dump( 'found existing experiment' );
                    loaded_exp = results[ experiment_name ];

//                     alert( 'appended to an existing experiment:\n' + loaded_exp.dump() );
                }

                loaded_exp.set_pos_id( experiment_pos, experiment_id );
                loaded_exp.set_pos_abacus_details( experiment_pos, abacus_details );
            }

            for( var nn in results )
            {
                if( g_tracing ) dump( 'experiment: ' + nn );
                if( g_tracing ) dump( results[nn].dump() );

//                 alert('loaded from page: ' + nn + '\n' + results[nn].dump() );
            }
        }
        catch(e)
        {
            if( g_tracing )
            {
                dump('exception parsing abacus page');
                dump(e);
            }
            else
            {
                alert(' parse abacus page:\n' + e);
            }
        }

        dump('**** done parsing config file, continue everything else ****\n');

        // change this only after 10 seconds have passed
        // connect_event_listeners();

        disable_pref_monitoring(10000);

        return results;
    },

/*

  <Experiment>
    <ShortName>TRIP</ShortName>
    <FullName>Trip Advisor Review Content for Hotel</FullName>
    <Description>
        When a hotel has less than 10 reviews, load review content
        from Trip Advisor.
    </Description>
    <ID pos="US" value="1044"/>
    <ID pos="UK" value="1045"/>
    <ID pos="JP" value="1046"/>
    <Bucket value="0" name="Only Expedia Reviews"/>
    <Bucket value="1" name="Load Trip Reviews when Expedia has 10 or less"/>
  </Experiment>

*/
    // todo: move to different file
    // load_prefs , or setup_experiments
    parseContents: function( content )
    {
        var read_experiments = new Array();

        try
        {
            var exp_regex = /<Experiment>([\s\S]*?)<\/Experiment>/ig;
            // todo: remove commented out parts <!--   to   -->
            var max_exp = 500;
            while( max_exp-- > 0 )
            {
                var exp_match = exp_regex.exec( content );
                if( null == exp_match )
                    break;

                if( g_tracing ) dump('experiment pulled out:\n' + exp_match[0] );

                var experiment_content = exp_match[0];

                var tla_regex = /<ShortName>([\s\S]+?)<\/ShortName>/i;
                var ful_regex = /<FullName>([\s\S]+?)<\/FullName>/i;
                var des_regex = /<Description>([\s\S]+?)<\/Description>/i;

                var pos_regex = /<ID\s+pos=['"]([^'^"]+)['"]\s+value=['"]([^'^"]+)['"]/ig;
                var bucket_regex = /<Bucket\s+value=['"]([^'^"]+)['"]\s+name=['"]([^'^"]+)['"]/ig;

                var tla_match = tla_regex.exec( experiment_content );
                var ful_match = ful_regex.exec( experiment_content );
                var des_match = des_regex.exec( experiment_content );

                if( null == tla_match || 2 > tla_match.length )
                    continue;

//                 if( g_tracing ) dump('tla:\n' + tla_match[1] );
//                 if( g_tracing ) dump('ful:\n' + ful_match[1] );
//                 if( g_tracing ) dump('des:\n' + des_match[1] );

                var pos_array = new Array();
                var max_pos = 150;
                while( max_pos-- > 0 )
                {
                    var pos_match = pos_regex.exec( experiment_content );
                    if( null == pos_match )
                        break;
                    if( g_tracing ) dump('pos:\n' + pos_match[1] + ' = ' + pos_match[2] );
                    pos_array[ pos_match[1] ] = pos_match[2];
                }

                var bucket_array = new Array();
                var max_bucket = 30;
                while( max_bucket-- > 0 )
                {
                    var bucket_match = bucket_regex.exec( experiment_content );
                    if( null == bucket_match )
                        break;
                    if( g_tracing ) dump('bucket:\n' + bucket_match[1] + ' = ' + bucket_match[2] );
                    bucket_array[ bucket_match[1] ] = bucket_match[2];
                }

                var loaded_exp = new exp_pref_bucket();

                if( null != tla_match && tla_match.length > 1 )
                    loaded_exp.tla = tla_match[1];

                if( null != ful_match && ful_match.length > 1 )
                    loaded_exp.full_name = ful_match[1];

                if( null != des_match && des_match.length > 1 )
                    loaded_exp.description = des_match[1];

                for(var pos_sn in pos_array)
                {
                    var pos_id = pos_array[ pos_sn ];

                    loaded_exp.set_pos_id( pos_sn, pos_id );
                }

                for( var bucket_index in bucket_array )
                {
                    var bucket_description = bucket_array[ bucket_index ];

                    loaded_exp.set_bucket_name( bucket_index, bucket_description );
                }
                if( g_tracing )
                {
                    dump( 'loaded exp:');
                    dump( loaded_exp.dump() );
                }

                read_experiments.push( loaded_exp );
            }
        }
        catch(e)
        {
            alert('parse contents:\n' + e);
        }
        return read_experiments;
    },

    add_tla_if_not_in_use: function( exp_loaded )
    {
        try
        {
            if( null == exp_loaded ||
                "undefined" == typeof( exp_loaded ) ||
                "undefined" == typeof( exp_loaded.tla ) )
                return;

            var tla_to_save = exp_loaded.tla;

            var first_empty = -1;
            var found_match = false;

            for(var i = 0 ; i < 6 ; i ++)
            {
                var sn = 'experiment' + i + '.tla';
                if( !this.prefs.prefHasUserValue( sn ) )
                {
                    first_empty = i;
                    continue;
                }
                var tla_read = this.prefs.getCharPref( sn );
                if( tla_read.length < 1 )
                {
                    first_empty = i;
                    continue;
                }
                if( tla_read == tla_to_save )
                {
                    found_match = true;
                    break;
                }
            }

//             alert('for tla ' + tla_to_save + ' status:' +
//                     '\nfirst empty = ' + first_empty +
//                     '\nfound match = ' + found_match );

            if( first_empty > -1 && !found_match )
            {
                var sn = 'experiment' + first_empty + '.tla';
                this.prefs.setCharPref( sn, tla_to_save );
            }
        }
        catch(e)
        {
            alert( 'add tla if not in use:\n' + e);
        }
    },

    // todo:
    // move this to separate file
    // do not write everything to memory at once
    // this bogs it down for quite a while
    // have some timer gradually put them in.
    //
    onMenuLoadWebPage: function( file_to_pull )
    {
        try
        {
            dump('**** parsing config file, pause everything else ****\n');
            disable_pref_monitoring(30000);

            if( "undefined" == typeof( file_to_pull ) )
                file_to_pull = window.content.document.location;
            if( g_tracing )
            {
                 dump('**********************');
                 dump('loading web page:\n' + file_to_pull );
                 dump('**********************');
            }

            var content = this.pull_file_contents( file_to_pull );

            var read_exps = this.parse_abacus_page( content );

            this.merge_loaded_experiments( read_exps );

            dump('**** done parsing config file, continue everything else ****\n');
            disable_pref_monitoring(10000);

            alert('parsing has completed');
         }
         catch(e)
         {
             dump('**exception** on menu load web page:\n' + e + '\n');
         }
    },

    update_last_pos_from_exp_id: function( id )
    {
        try
        {

            var pos_match = active_page_abacus.get_pos_from_exp_id( id );

            // todo: set this if no match found?
            // if no match found we may want to give big error message.
            InstaBucket.last_pos = pos_match;
        }
        catch(e)
        {
            dump( 'update_last_pos_from_exp_id:\n' + e + '\n' );
        }
    },


    // go through the experiments we have in memory
    // find one that matches the id given
    // if the match is hidden, then move on to the next one.
    find_exp_with_id: function( id, exp_list )
    {
        var default_tla = 'xyz';
        var last_match_found = null;
        try
        {
            if( !id )
                return null;

            // what if exp_list passed in differs from previous cache run?
            var exp_from_cache = this.exp_id_lookup[ id ];
            if( exp_from_cache )
            {
//                 dump( '  ok cache lookup of id: ' + id + ' found: ' + exp_from_cache + '\n' );
                if( !this.get_is_experiment_hidden( exp_from_cache.tla ) )
                {
                    return exp_from_cache;
                }
                last_match_found = exp_from_cache;
                dump('cache value was hidden: ' + exp_from_cache.tla + ', keep looking');
            }

            if( typeof( exp_list ) == "undefined" || null == exp_list || 1 > exp_list.length )
            {
                exp_list = this.exp_list_cache;
            }

            if( typeof( exp_list ) == "undefined" || null == exp_list || 1 > exp_list.length )
            {
                dump('constructing entire list ');
                exp_list = new Array();
                this.exp_list_cache = new Array();

                var tla_list = this.load_all_exp_tla_names();

                var tla_count = tla_list.length;
                for( var i = 0 ; i < tla_count ; i ++)
                {
                    var tla = tla_list[i];
                    if( tla.length < 1 )
                    {
                        // if tla not found, then default to use exp id.
//                         tla = i;
                        // showing the id fails, we don't know what pos it goes to.
                        continue;
                    }
                    var exp_obj = InstaBucket.load_exp_pref_tla( tla );

                    if( !exp_obj )
                    {
                        dump( tla );
//                         dump('null exp_obj for tla:<' + tla + '>\n' );
//                         var e_ob = new exp_pref_bucket();
//                         e_ob.tla = tla;
//                         e_ob.full_name = tla + '_???';
                        continue;
                    }
                    else
                    {
                        dump('werty loaded tla: ' + tla + ' exp loaded: ' + exp_obj + '  id:' + exp_obj.full_name + '\n' );
                    }

                    exp_list.push( exp_obj );
                    this.exp_list_cache.push( exp_obj );
                    dump('.');
                }
                dump('\n');
            }

            var highest_id = -1;
            var list_length = exp_list.length;

            for(var i = 0 ; i < list_length ; i ++)
            {
                var exp_obj = exp_list[i];
                if( null == exp_obj )
                    continue;

                // we must keep track of hidden items also.
//                 if( this.get_is_experiment_hidden( exp_obj.tla ) )
//                 {
//                     dump( 'cache build in find_exp_with_id hit hidden tla: ' + exp_obj.tla );
//                     continue;
//                 }

                for(var p in exp_obj.id_pos )
                {
                    var id_pos = exp_obj.id_pos[p];
                    if( id_pos > highest_id )
                    {
                        highest_id = id_pos;
                    }

                    this.exp_id_lookup[ id_pos ] = exp_obj;
                }
            }

            dump('creating lookup items:');
            // fill in missing items
            for( var i = 0 ; i < highest_id ; i ++)
            {
                var ex_lookup = this.exp_id_lookup[ i ];
                if( !ex_lookup )
                {
                    var exp_ob = new exp_pref_bucket();
                    exp_ob.tla = i;
                    exp_ob.full_name = i + '_missing';
                    exp_ob.id_pos['AU'] = i;  // hide in some POS not to be noticed.

                    this.exp_id_lookup[ i ] = exp_ob;

//                     dump('  created lookup item for ' + i + '\n');
                    dump('.');
                }
            }
            dump('\n');

            exp_from_cache = this.exp_id_lookup[ id ];
            return exp_from_cache;

        }
        catch(e)
        {
            dump('**exception**\nfind exp with id:\n' + e + '\n');
        }
        return last_match_found;
    },

    merge_loaded_experiments: function( add_these )
    {
        try
        {
            // go through all the added guys
            // get the experiment id for US, or another
            //
            // go through the current guys, seeking a match

            for( var at in add_these )
            {
                var old_exp_matching = null;

                var new_exp = add_these[at];

//                 alert( 'merging in new experiment:\n' + new_exp.dump() );

                if( null == new_exp )
                {
//                     alert(' null add guy for at: ' + at );
                    continue;
                }

                for( var i in new_exp.id_pos )
                {
                    new_other_id = new_exp.id_pos[i];
                    old_exp_matching = this.find_exp_with_id( new_other_id, this.exps_list );
                }

                if( null != old_exp_matching )
                {
//                     alert( 'merged new exp: ' + new_exp.full_name +
//                             '\ninto old exp: ' + old_exp_matching.full_name );

                    this.merge_new_into_old_exp( new_exp, old_exp_matching );

                    this.save_exp_pref( old_exp_matching );
                    // this.add_tla_if_not_in_use( updated_experiment );
                }
                else
                {
                    // no existing experiment is similar, so save a new one.
                    this.save_exp_pref( new_exp );
                    this.add_tla_if_not_in_use( new_exp );
                }
            }
        }
        catch(e)
        {
            alert('merge loaded experiments:\n' + e);
        }
    },

    merge_new_into_old_exp: function( new_exp, old_exp )
    {
        try
        {
            // old_exp.tla = new_exp.tla;   // keep the old tla
            if( typeof( old_exp.full_name ) == "undefined" || old_exp.full_name.length < 1 )
                old_exp.full_name = new_exp.full_name;
            for( var i in new_exp.id_pos )
            {
                if( "undefined" == typeof( old_exp.id_pos[i] ) )
                {
                    old_exp.id_pos[i] = new_exp.id_pos[i];
                }
            }
            for( var bb in new_exp.bucket_names )
            {
                if( "undefined" == typeof( old_exp.bucket_names[bb] ) )
                {
                    old_exp.bucket_names[bb] = new_exp.bucket_names[bb];
                }
            }
        }
        catch(e)
        {
            alert('merge new into old exp:\n' + e);
        }
    },

    onMenuLoadFile: function( file_to_pull )
    {
        try
        {
            if( "undefined" == typeof( file_to_pull ) )
                file_to_pull = window.content.document.location;
            if( g_tracing )
            {
                 dump('**********************');
                 dump('pulling file:\n' + file_to_pull );
                 dump('**********************');
             }

            var content = this.pull_file_contents( file_to_pull );

            var read_exps = this.parseContents( content );

            var read_count = 0;
            var letter_s = '';
            for( var i in read_exps )
            {
                var read_experiment = read_exps[i];
                this.save_exp_pref( read_experiment );
                this.add_tla_if_not_in_use( read_experiment );
                read_count++;
            }
            if( read_count > 1 )
                letter_s = 's';
            if( read_count > 0 )
            {
                alert('read in ' + read_count + ' experiment' + letter_s + '.');
            }
            else
            {
                alert('expecting file with syntax:' +
                        '\n<html>' +
                        '\n<!--' +
                        '\n<?xml version="1.0" encoding="UTF-8"?>' +
                        '\n-->' +
                        '\n' +
                        '\n<ExpediaExperiments>' +
                        '\n<!--' +
                        '\n    load in browser and select  Load File  from context menu' +
                        '\n-->' +
                        '\n' +
                        '\n  <Experiment>' +
                        '\n    <ShortName></ShortName>' +
                        '\n    <FullName></FullName>' +
                        '\n    <Description>' +
                        '\n    </Description>' +
                        '\n    <ID pos="" value=""/>' +
                        '\n    <Bucket value="" name=""/>' +
                        '\n  </Experiment>' +
                        '\n' +
                        '\n</ExpediaExperiments>' +
                        '\n' +
                        '\n</html>' +
                        '\n' );
            }
        }
        catch(e)
        {
            alert('onMenuLoadFile:\n' + e);
        }
    },

    onMenuDisable: function( checked )
    {
        dump('on menu disable: ' + checked + '\n');
        // we get whatever it is being set to. checked = new value.
//         alert( 'checked value: ' + checked );

//         g_disabled = !g_disabled;  // first try, just toggle it.
        g_disabled = !checked;       // better, match the check item.

        this.set_is_update_disabled( !checked );

        // auto checked menu item, don't need to set the check value.
//         var menu_item = document.getElementById("bucket-menu-prefs");
//         if( null != menu_item && "undefined" != typeof( menu_item ) )
//         {
//             menu_item.checked = g_disabled;
//         }
    },

    onMenuAdd: function()
    {
        try
        {
//             var nodeId = document.popupNode.id;
//             var id_len = nodeId.length;
//             var status_bar_index = nodeId.substr( id_len-1 );

            // var status_bar_index = this.set_active_status_bar_item_from_popup_node_id();
            var status_bar_index = this.get_active_status_bar_item();

            // active item is set when menu is opened
            // this.set_active_status_bar_item( status_bar_index );

            alert('to be done, index:' + status_bar_index);
            return;

//             alert('popup node id: ' + document.popupNode.id);

//             var statusBar = document.getElementById('status-bar');
//             var panel = document.createElement("statusbarpane");
//             var added = statusBar.appendChild(panel);
//             added.label = 'hello';

//             alert('typeof(this) = ' + typeof(this));
//             alert('this.label = ' + this.label);
//             alert('this.value = ' + this.value);
//             alert('this.name = ' + this.name);
//             alert('this.id = ' + this.id);
        }
        catch(e)
        {
            alert('insert menu:\n' + e);
        }
    },

    // find lower case letter followed by capital letter
    // insert space between the two
    inject_spaces: function( fill_me )
    {
        try
        {
            fill_me = fill_me.replace( /(end)(to)(end)/ig, "$1 $2 $3" )
            fill_me = fill_me.replace( /([a-z])([A-Z])/g, "$1 $2" )
            fill_me = fill_me.replace( /(SR)([A-Z][a-z])/g, "$1 $2" )
            fill_me = fill_me.replace( /(DRR)([A-Za-z])/g, "$1 $2" )
            fill_me = fill_me.replace( /([A-Z])(DRR)/g, "$1 $2" )
            fill_me = fill_me.replace( /(UI)([A-Z][a-z])/g, "$1 $2" )
            fill_me = fill_me.replace( /([A-Z])(UI)/g, "$1 $2" )
            fill_me = fill_me.replace( /( TA)([a-z])/g, "$1 $2" )
        }
        catch(e)
        {
            alert('exception injecting spaces:\n' + e);
        }

        return fill_me;
    },

    // based on current experiments in memory, update the status bar
    // array of experiments :  this.exps_list
    updateStatusBar: function()
    {
        try
        {
            // statusbar
            var statusBar = document.getElementById('status-bar');
            var max_status_bar_items = 20;
            var use_full = InstaBucket.get_is_showing_full_names();

            // todo: show the caller.
            dump('>>>>>>>>>> update status bar, use full=' + use_full + '\n');

            // todo: go through each status bar guy
            // load the tla based on the savename
            // load the experiment based on the tla

            // save names are one based.

            // set defaults to empty and black
            for( var i = 0 ; i < max_status_bar_items ; i ++)
            {
                var panelId = 'insta-bucket-' + i;
                var panel = document.getElementById( panelId );
                if( null == panel || "undefined" == typeof( panel ) )
                {
                    // happens when the prefs dialog is open
                    // and the request thread starts in the dialog
                    break;
                }

                var panelColor = 'black';

                panel.label = '';
                panel.tooltipText = '';
                panel.style.color = panelColor;
            }

            for( var i = 0 ; i < max_status_bar_items ; i ++)
            {
                var panelId = 'insta-bucket-' + i;
                var panel = document.getElementById( panelId );
                if( null == panel || "undefined" == typeof( panel ) )
                {
                    // happens when the prefs dialog is open
                    break;
                }
                panel.label = '';
                panel.tooltipText = '';
                panel.style.color = 'black';

                var panel_display_text = '';
                var panel_tool_tip_text = '';
                var panel_experiment_tla = '';
                var panel_experiment_full_name = '';
                var panel_experiment_text_to_show = '';
                var panel_experiment_bucket = '';
                var panel_display_color = 'black';

                var exp_pref_bucket_obj = this.exps_list[i];
                if( null == exp_pref_bucket_obj )
                {
//                     dump('experiment bucket obj is null, no update for exp:' + i + '\n');
                    dump('exbo null ' + i);
                    continue;
                }

                var e = exp_pref_bucket_obj;

                var full_bucket_name = '-';
                panel_experiment_tla = e.tla;

                panel_experiment_full_name = e.full_name;
                if( typeof( panel_experiment_full_name ) == "undefined" )
                    panel_experiment_full_name = panel_experiment_tla;

                var full_list_of_pos = '';

                var pos_list = e.get_pos_array();
                var pos_count = pos_list.length;

                var tt_spacer = '';
                for( var ppp = 0 ; ppp < pos_count ; ppp ++ )
                {
                    var tt_pos = pos_list[ppp];
                    var tt_id = e.get_pos_id( tt_pos );

                    full_list_of_pos += tt_spacer + tt_pos + ':' + tt_id;
                    tt_spacer = '  ';
                }

                panel_experiment_text_to_show = panel_experiment_tla;
                if( use_full )
                {
                    panel_experiment_text_to_show = panel_experiment_full_name;
                    panel_experiment_text_to_show = InstaBucket.inject_spaces( panel_experiment_text_to_show );
                }

                if( typeof( panel_experiment_text_to_show ) == "undefined" )
                    panel_experiment_text_to_show = '';

                var bucket = '-1';
                var id = '';

                if( "undefined" != typeof(e.bucket) && null != e.bucket  )
                {
                    bucket = e.bucket;
                    full_bucket_name = e.get_bucket_name( bucket );

                    // todo: fix bucket reading to return number, not blank.
                    if( bucket.length < 1 )
                        bucket = -1;
                }
                else
                {
                    bucket = -1;
                    full_bucket_name = '-- unknown --';
                }

                if( g_testing )
                    id = e.get_pos_id( 'US' );
                else
                    id = e.get_pos_id( InstaBucket.get_pos() );

//                 dump('index ' + i + ', pos ' + InstaBucket.get_pos() + ' id = ' + id + ' bucket: ' + bucket + '\n');

                var panelLabel = panel_experiment_text_to_show + ": " + bucket;

                var panelToolTip = InstaBucket.get_pos() + "      " + panel_experiment_full_name +
                    "\n            " + full_bucket_name + "      " + "\n" +
                    full_list_of_pos;

                if( bucket == 0 )
                {
                    panel_display_color = 'red';
                }
                else if( bucket == 1 )
                {
                    panel_display_color = 'blue';
                }
                else if( bucket == 2 )
                {
                    panel_display_color = 'orange';
                }
                else if( id > -1 )
                {
                    // experiment is valid for this pos
                    // but we don't know what the current bucket is.
                    panel_display_color = 'black';
                    // remove the bucket number from display.
                    panelLabel = panel_experiment_text_to_show;
                }
                else
                {
                    panel_display_color = 'grey';
                    // remove the bucket number from display.
                    panelLabel = panel_experiment_text_to_show;
                }

                panel.label = panelLabel;
                panel.tooltipText = panelToolTip;
                panel.style.color = panel_display_color;

                InstaBucket.haveShownSomething = true;

                dump('  sb:' + i + ' id:' + id + ' tla:' + tla + 'bucket: ' + bucket + '\n');

                var stored_tla = this.load_exp_pref_index( i );
                if( stored_tla != panel_experiment_tla )
                {
                    // this stores whatever is to be displayed
                    // but we want to use it, to know the tla.
                    this.set_exp_pref_index( i, panel_experiment_tla );
                }
            }
        }
        catch(e)
        {
            dump('**exception** update status bar:\n' + e + '\n');
        }
    },

    refreshInformation: function( forced )
    {
        dump('*\n*\n*\ncalled old version of refreshInformation\n*\n*\n');
        return blah( forced );
    },

    // was refresh_experiment_display
    refresh_buckets: function( forced )
    {
        try
        {
            if( null == forced || "undefined" == typeof( forced ) )
                forced = false;

            dump('>>>>>>>>>> refresh buckets  ' + forced + '\n');

            if( !ExpWebReader )
            {
                dump( 'refresh buckets : exp web reader is null\n' );
                return;
            }

//             dump_exps( 'refresh buckets' );


            var is_live_pos = 0;
            if( ExpWebReader.url_environment != null &&
                'undefined' != typeof( ExpWebReader.url_environment ) &&
                ExpWebReader.url_environment.length == 0 )
            {
                is_live_pos = 1;
            }

            var html_bucket_provider = InstaBucket.get_is_detect_bucket_via_html();
            var omn_bucket_provider = InstaBucket.get_is_detect_bucket_via_omniture();

            var previous_attempt_result = ExpWebReader.get_attempt_result();

//             dump('refresh information: live pos = ' + is_live_pos +
//                     ', previous attempt = ' + previous_attempt_result + '\n');

            dump('** refresh buckets, forced = ' + forced +
                ', live = ' + is_live_pos + ', g_disabled = ' + g_disabled + '\n' );

            if( forced )
            {
                if( is_live_pos )
                {
                    dump('refresh: forced, live pos, update buckets\n');
                    this.updateBuckets();
                }
                else if( previous_attempt_result )
                {
                    dump('refresh: forced, previous attempt had success, update buckets\n');
                    this.updateBuckets();
                }
                else if( html_bucket_provider || omn_bucket_provider )
                {
                    dump( 'refresh: forced, omn,html bucket search\n' );
                    this.updateBuckets();
                }
                else
                {
                    dump('refresh: forced, previous attempt had failure, do not request safe page\n');
                    this.updateBuckets();

                    // todo: the user requested an update, do something.
//                     this.updateBuckets();

                    // recovery is a very messy thing
                    // the idea was to popup the page to get stuff working
                    // every now and then this goes south, causing unwanted popups.
                    //
                    // the user must select menu: Check Bucket Via URL : make this Pos Env safe
                    //
                    //
//                     var ex;
//                     for(var i = 0 ; i < 6 ; i ++)
//                     {
//                         ex = this.exps_list[i];
//                         if( ex != null && typeof( ex ) != 'undefined' )
//                         {
//                             break;
//                         }
//                     }

//                     var experiment_id = ex.get_pos_id( InstaBucket.get_pos() );
//                     dump( 'refresh, request: forced, safe page for id: ' + experiment_id + '\n' );
//                     ExpWebReader.try_recover_security_issue( experiment_id );
                }
            }
            else
            {
//                 alert(' attempt result: ' + previous_attempt_result );

                if( !g_disabled && previous_attempt_result )
                {
                    dump( 'refresh, previous attempt success\n' );
//                     alert(' ready to update buckets' );
                    this.updateBuckets();
                }
                else if( !g_disabled && is_live_pos )
                {
                    // live site doesn't have the https issues
                    dump( 'refresh, live site\n' );
                    this.updateBuckets();
                }
                else if( (html_bucket_provider || omn_bucket_provider) && !g_disabled )
                {
                    dump( 'refresh, html,omn bucket search\n' );
                    this.updateBuckets();
                }
                else
                {
                    dump( 'else finally\n' );
                    this.updateBuckets();
                }
            }

            this.updateStatusBar();
        }
        catch(e)
        {
            dump("**exception** InstaBucket refresh information:\n" + e + '\n');
        }

    }
}


InstaBucket.startup();

function connect_event_listeners()
{
    InstaBucket.prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
//            .getDefaultBranch("InstaBucket.")   # default branch is always included.
            .getBranch("InstaBucket.");
    InstaBucket.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);

    InstaBucket.defaults = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
//            .getBranch("InstaBucket.");
            .getDefaultBranch("InstaBucket."); // default branch is always included.

    InstaBucket.prefs.addObserver("", InstaBucket, false);

    // copied from firefox extension wats
    InstaBucket._observerService =
        Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    InstaBucket._observerService.addObserver(InstaBucket, "http-on-modify-request", false);
    // magically calls "observe: function"

    window.addEventListener("load", function(e) { InstaBucket.startup(); }, false);
    window.addEventListener("unload", function(e) { InstaBucket.shutdown(); }, false);
    window.addEventListener("TabSelect", onTabSelect, false);

//             var messagepane = document.getElementById("messagepane"); // mail
//             if(messagepane)
//                 messagepane.addEventListener("load", function() { onLoad(); }, true);

    var browser_element = document.getElementById("appcontent");   // browser
            // on content ready
            // on dom ready         - doc loaded and parsed
            // yui - content throws event
    if( browser_element )
    {
        browser_element.addEventListener("load", function(evt) { onLoad(evt); }, true);
//         appcontent.addEventListener("load", onLoad(), true);
        // called much too often to be useful.
//         appcontent.addEventListener("DOMContentLoaded", onDomContentLoaded, true);
    }
}

function disconnect_event_listeners()
{
//     InstaBucket.prefs = Components.classes["@mozilla.org/preferences-service;1"]
//             .getService(Components.interfaces.nsIPrefService)
//             .getBranch("InstaBucket.");
//     InstaBucket.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);

    InstaBucket.prefs.removeObserver("", this);
    InstaBucket.prefs.removeObserver("", InstaBucket, false);

    // copied from firefox extension wats
//     InstaBucket._observerService =
//         Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    InstaBucket._observerService.removeObserver(InstaBucket, "http-on-modify-request", false);
    // magically calls "observe: function"

    window.removeEventListener("load", function(e) { InstaBucket.startup(); }, false);
    window.removeEventListener("unload", function(e) { InstaBucket.shutdown(); }, false);
    window.removeEventListener("TabSelect", onTabSelect, false);

    var browser_element = document.getElementById("appcontent");   // browser
            // on content ready
            // on dom ready         - doc loaded and parsed
            // yui - content throws event
    if( browser_element )
    {
        browser_element.removeEventListener("load", function(evt) { onLoad(evt); }, true);
    }
}

function exampleTabAdded()
{
  alert("tab added");
}

function exampleTabMoved()
{
  alert ("tab moved");
}

function exampleTabRemoved()
{
  alert("removed.");
}


// todo: find something that isn't called as often.
function onDomContentLoaded()
{
    try
    {
        if( !check_if_monitoring_disabled ) return;
        if( check_if_monitoring_disabled() ) return;
        checkTabContent( 'onDomContentLoaded' );
    }
    catch(e)
    {
        dump( '**exception** on dom content loaded:\n' + e );
    }
}

// getting called so often
// prevent too many updates
var pref_changed_helper =
{
    external_trigger : function()
    {
        try
        {
        }
        catch(e)
        {
            dump('**exception** pref changed helper:\n' + e + '\n');
        }
    }
}

// with so many updates as the page is loading
// wait for a change of meaning before parsing or updating.
var page_complete_helper =
{
    external_trigger : function()
    {
        try
        {
            this.update_time_of_onload();
            this.update_html();
//             this.show_status();
        }
        catch(e)
        {
            dump('exception in page complete helper : external trigger : \n' + e);
        }
    },

    update_parsing_action_suggested : function()
    {
        return (
            this.html_jump_count > 3 &&
            this.html_delta() > 0 );
    },


    // this on load thing isn't working out
    // getting way too many on load calls
    // to deal with that, watch how much time has passed, and the html char count.
    on_load_count : 0,
    current_html_length : 0,
    previous_html_length : 0,
    current_load_time : 0,
    previous_load_time : 0,
    html_jump_count : 0,
    delta_history : '',

    reset_counters : function()
    {
        this.on_load_count = 0;
        this.current_html_length = 0;
        this.previous_html_length = 0;
        this.current_load_time = 0;
        this.previous_load_time = 0;
        this.html_jump_count = 0;
        this.delta_history = '';
    },

    time_delta : function()
    {
        return this.current_load_time - this.previous_load_time;
    },

    html_delta : function()
    {
        return this.current_html_length - this.previous_html_length;
    },

    update_time_of_onload: function()
    {
        this.previous_load_time = this.current_load_time;
        var d = new Date();
        this.current_load_time = d.getTime();

        if( this.time_delta() > 5000 )
        {
            dump('\n delta is: ' + this.time_delta() + ' so resetting\n');
            this.reset_counters();
            this.current_load_time = d.getTime();
            this.previous_load_time = this.current_load_time;
        }
    },

    update_html : function()
    {
        this.previous_html_length = this.current_html_length;

        var html = active_page_abacus.get_page_inner_html();
        this.current_html_length = html.length;

        if( this.html_delta() > 0 )
        {
            this.html_jump_count++;
        }
    },

    show_status : function()
    {
        this.delta_history += ' ' + this.time_delta();
        if( this.html_delta() > 0 )
        {
            this.delta_history += '(' + this.html_delta() + ')';
        }
//         dump( 'page complete helper html(' + this.current_html_length +
//                 ') time delta history: ' + this.delta_history + '\n' );
    }
}

function onLoad(evt)
{
    try
    {
        if( !check_if_monitoring_disabled ) return;
        if( check_if_monitoring_disabled() ) return;
        if( false && evt )
        {
            dump(' * on load evt stuff:\n');
            for( var e in evt )
            {
                dump( e + ' = ' + evt[e] + '\n');
            }
        }

    //     dump(' * on load, ');
        page_complete_helper.external_trigger();
        page_complete_helper.show_status();

        if( page_complete_helper.html_jump_count < 2 )
        {
            InstaBucket.haveShownSomething = false;
        }

        if( page_complete_helper.update_parsing_action_suggested() )
        {
            checkTabContent( 'onLoad' );
        }
    }
    catch(e)
    {
        dump( '**exception** onLoad:\n' + e + '\n' );
    }
}

// todo: respond to tab select
// pull the point of sale, to change the experiment ids
// pull the environment portion of the url
function onTabSelect()
{
    try
    {
        if( !check_if_monitoring_disabled ) return;
        if( check_if_monitoring_disabled() ) return;

        checkTabContent( 'onTabSelect' );
    }
    catch(e)
    {
        dump( '**exception** on tab select:\n' + e + '\n' );
    }
}

// the page just loaded, or the user clicked the tab
// entry point to change the layout, update buckets, redraw stuff
function checkTabContent( who_called )
{
    try
    {
        // check for the wrong context, such as the Add-ons tab
        if( null == window.content )
        {
            dump('check tab content: window content is null, return\n');
            return;
        }

        expert = window.content.document.getElementById("expertContent");
//        allLinks = window.content.document.getElementsByTagName("a"),
//         alert( 'link count: ' + allLinks.length );
        if( expert != null )
        {
            // alert( 'expert = ' + expert );

            // expert.click();

            expert.collapsed='false';

            var colapsed = expert.getAttribute('collapsed');
            if( colapsed != null && "undefined" != typeof( colapsed ) )
            {
                if( colapsed == 'false' )
                {
                    dump('expert content is not collapsed');
                    return;
                }
            }
        }

//         var exception_button = window.content.document.getElementById('exceptionDialogButton');
//         exception_button.onclick();
//         exception_button.oncommand();

        // todo: ask around, is this the right way?
        var new_url = window.content.document.URL;
        new_url = unescape( new_url );

        if( null == new_url || "undefined" == typeof( new_url ) || new_url.length < 20 )
        {
            dump('check tab content: null or short url, return\n');
            return;
        }

        if( new_url == InstaBucket.last_url ) // && this.haveShownSomething )
        {
            var using_html_for_exp = InstaBucket.get_is_detect_bucket_via_html();
            var using_omn_for_exp = InstaBucket.get_is_detect_bucket_via_omniture();

            if( !using_html_for_exp && !using_omn_for_exp )
            {
                dump('same url, pref has html and omn checks turned off\nreturn\n');
                return;
            }

            if( ( using_html_for_exp || using_omn_for_exp ) &&
                !InstaBucket.haveShownSomething )
            {
                // continue. try again, even though the url is the same.
            }
            else
            {
                dump( who_called + ', no url change, continue anyway.\n');
//                 return;
            }
        }
        else
        {
            InstaBucket.haveShownSomething = false;
            // todo: this shows up 20 times when loading a new url
            dump('storing last url as: ' + new_url + '\n');
            InstaBucket.set_current_url( new_url );
        }

        for( var i = 0 ; i < 20 ; i ++) dump('\n');
        dump('check tab content :: ' + who_called + '\n');
        for( var i = 0 ; i < 20 ; i ++) dump('\n');


        var previous_pos = InstaBucket.get_pos();
        var previous_env = InstaBucket.get_env();

        // he'll take care of all the http:// stuff.
        ExpWebReader.set_domain( new_url );

        var new_pos = InstaBucket.get_pos();
        var new_env = InstaBucket.get_env();

        var known_change = ( previous_pos != new_pos || previous_env != new_env );

//         alert(  ' domain:' + ExpWebReader.url_domain +
//                 '\n environ:' + ExpWebReader.url_environment +
//                 '\n pos:' + InstaBucket.get_pos() );

        // now that the domain ( pos and environment )
        // have changed, reset our experiment information.

        InstaBucket.update_prefs( known_change );
    }
    catch(e)
    {
        alert("tab selected:\n" + e);
    }
}


function dump_exps( context )
{
    try
    {
        dump('experiment dump:  ' + context + '\n');
        var count = InstaBucket.exps_list.length;
        for( var i = 0 ; i < count ; i ++)
        {
            dump('  ' + i + ' = ' + InstaBucket.exps_list[i] + '\n');
        }
    }
    catch(e)
    {
        dump('**exception** dump exps:\n' + e + '\n');
    }
}


if( g_testing )
{
//     var abc = new Array();

//     var ii = 'goober';
//     abc[ii] = 123;

//     dump( ii + ' = ' + abc[ii] );

//     var letters = 'aabc';
//     dump( letters.toUpperCase() );

//     var epb = new exp_pref_bucket();
//     epb.set_pos_id( 'us', 500 );
//     epb.set_pos_id( 'us', 700 );
//     epb.set_pos_id( 'uk', 800 );
//     epb.set_pos_id( 'us', 701 );

//     dump( 'us = ' + epb.get_pos_id( 'us' ) );
//     dump( 'uk = ' + epb.get_pos_id( 'uk' ) );

//    alert(' startup ' );
//    InstaBucket.startup();

//    InstaBucket.startup();

//     var complete_tla_list = InstaBucket.load_all_exp_tla_names();
//     dump( 'update page content, count: ' + complete_tla_list.length );
//     dump( 'update page content, list: ' + complete_tla_list );


//     var eb = new exp_pref_bucket();

//     eb.tla = 'zzz';
//     eb.full_name = '11112 3  44  5 5 6 6  7 7 88  90 0000 ';
//     eb.bucket = 1;
//     eb.changed = true;

//     eb.set_pos_id( 'us', 8888 );
//     eb.set_pos_id( 'uk', 8889 );
//     eb.set_pos_id( 'vsc', 8890 );
//     eb.set_bucket_name( 0, '1112 2323 3 4 4 5555666 ' );
//     eb.set_bucket_name( 1, '11 23445 55 66 77 78 89' );

//     InstaBucket.save_exp_pref( eb );

//     var loaded_eb = InstaBucket.load_exp_pref_tla( 'zzz' );

//     dump('loaded guy:');
//     dump(loaded_eb.dump());

//     var input_file = 'file:///c:/temp/load_prefs.xml';
//     InstaBucket.onMenuLoadFile( input_file );


        InstaBucket.startup();

        var tla = 'HITAs';
        dump( ' test the loading of tla: ' + tla + '\n' );
        var loaded_eb = InstaBucket.load_exp_pref_tla( tla );

        var tla = 'PDP';
        dump( ' test the loading of tla: ' + tla + '\n' );
        var loaded_eb = InstaBucket.load_exp_pref_tla( tla );

        InstaBucket.prefs.resetBranch('');

//         test_save_group();
//         test_load_group();
//         test_load_missing_group();
//         test_group_change();
//         test_group_multiple();


        // c:\dev\ff_plugin\abacus_page.htm
//         var input_web_page = 'file:///c:/dev/ff_plugin/abacus_page.htm';
//         InstaBucket.onMenuLoadWebPage( input_web_page );

//         if( g_tracing ) dump('count: ' + InstaBucket.exps_list.length );

//     var old_exp = new exp_pref_bucket();
//     old_exp.tla = 'old exp';

//     if(g_tracing)
//     {
//         dump('old before merge:');
//         dump(old_exp.dump());
//     }

//     var new_exp = new exp_pref_bucket();
//     new_exp.set_pos_id( 'US', 1234 );
//     new_exp.set_bucket_name( 1, 'this bucket set in code' );

//     InstaBucket.merge_new_into_old_exp( new_exp, old_exp );

//     if(g_tracing)
//     {
//         dump('old after merge:');
//         dump(old_exp.dump());
//     }
}

function test_save_group()
{
    dump('starting test save group');
    var group_name = 'testing';
    var tla_names = new Array();
    tla_names.push( 'group name 1' );
    tla_names.push( 'group name 2' );
    tla_names.push( 'group name 3' );
    InstaBucket.save_group_exp_tla_names( group_name, tla_names );
}

function test_load_group()
{
    dump('starting test load group');

    var group_name = 'testing';
    var names = InstaBucket.load_group_exp_tla_names( group_name );

    dump('loaded group: ' + group_name );

    for( var i = 0 ; i < names.length ; i ++)
    {
        dump( names[i] );
    }
    InstaBucket.clear_group_exp_tla_names( group_name );
    var names = InstaBucket.load_group_exp_tla_names( group_name );

    dump('count after delete: ' + names.length );
}

function test_load_missing_group()
{
    var group_name = 'not going to be found';
    var names = InstaBucket.load_group_exp_tla_names( group_name );

    var group_name2 = '';
    var names2 = InstaBucket.load_group_exp_tla_names( group_name2 );

    var group_name3;
    var names3 = InstaBucket.load_group_exp_tla_names( group_name3 );
}

function test_group_multiple()
{
    dump('starting test group change');
    var group_name = 'testing';
    var tla_names = new Array();
    tla_names.push( 'group name 1' );
    tla_names.push( 'group name 2' );
    tla_names.push( 'group name 3' );
    tla_names.push( 'group name 3' );
    tla_names.push( 'group name 4' );
    InstaBucket.save_group_exp_tla_names( group_name + 'a', tla_names );
    tla_names.push( 'group name 5' );
    InstaBucket.save_group_exp_tla_names( group_name + 'b', tla_names );
    tla_names.push( 'group name 6' );
    InstaBucket.clear_group_exp_tla_names( group_name + 'a' );
    InstaBucket.save_group_exp_tla_names( group_name + 'c', tla_names );
    tla_names.push( 'group name 7' );
    InstaBucket.save_group_exp_tla_names( group_name + 'd', tla_names );
    tla_names.push( 'group name 8' );
    InstaBucket.save_group_exp_tla_names( group_name + 'e', tla_names );
    tla_names.push( 'group name 9' );

    var names = InstaBucket.load_group_exp_tla_names( group_name + 'c' );
    dump('should go to 6');
    for(var nn in names)
    {
        dump(group_name + 'c has item:' + names[nn]);
    }
    InstaBucket.clear_group_exp_tla_names( group_name + 'a' );
    InstaBucket.clear_group_exp_tla_names( group_name + 'b' );
    InstaBucket.clear_group_exp_tla_names( group_name + 'c' );
    InstaBucket.clear_group_exp_tla_names( group_name + 'd' );
    InstaBucket.clear_group_exp_tla_names( group_name + 'e' );
}

function test_group_change()
{
    dump('starting test group change');
    var group_name = 'testing2';
    var tla_names = new Array();
    tla_names.push( 'group name 1' );
    tla_names.push( 'group name 2' );
    tla_names.push( 'group name 3' );
    tla_names.push( 'group name 3' );
    tla_names.push( 'group name 4' );
    InstaBucket.save_group_exp_tla_names( group_name, tla_names );

    var names = InstaBucket.load_group_exp_tla_names( group_name );

    dump('test group change count 1: ' + names.length );

    var tla_names2 = new Array();
    tla_names2.push( 'group name 1' );
    tla_names2.push( 'group name 2' );
    tla_names2.push( 'group name 4' );
    InstaBucket.save_group_exp_tla_names( group_name, tla_names2 );
    var names2 = InstaBucket.load_group_exp_tla_names( group_name );

    dump('test group change count 2: ' + names2.length );

    InstaBucket.clear_group_exp_tla_names( group_name );
}
/*
// http://eriwen.com/javascript/js-stack-trace/
function dumpStackTrace() {
  var callstack = [];
  var isCallstackPopulated = false;
  try {
    i.dont.exist+=0; //doesn't exist- that's the point
  } catch(e) {
    if (e.stack) { //Firefox
      var lines = e.stack.split('\n');
      for (var i=0, len=lines.length; i&lt;len; i++) {
        if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
          callstack.push(lines[i]);
        }
      }
      //Remove call to dumpStackTrace()
      callstack.shift();
      isCallstackPopulated = true;
    }
    else if (window.opera &amp;&amp; e.message) { //Opera
      var lines = e.message.split('\n');
      for (var i=0, len=lines.length; i&lt;len; i++) {
        if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
          var entry = lines[i];
          //Append next line also since it has the file info
          if (lines[i+1]) {
            entry += ' at ' + lines[i+1];
            i++;
          }
          callstack.push(entry);
        }
      }
      //Remove call to dumpStackTrace()
      callstack.shift();
      isCallstackPopulated = true;
    }
  }
  if (!isCallstackPopulated) { //IE and Safari
    var currentFunction = arguments.callee.caller;
    while (currentFunction) {
      var fn = currentFunction.toString();
      var fname = fn.substring(fn.indexOf(&amp;quot;function&amp;quot;) + 8, fn.indexOf('')) || 'anonymous';
      callstack.push(fname);
      currentFunction = currentFunction.caller;
    }
  }
  output(callstack);
}

function output(arr) {
  //Optput however you want
  alert(arr.join('\n\n'));
}
*/
