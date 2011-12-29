
// populate the list of groupings

function init_basics_pane()
{
    try
    {
//         alert('called init basics pane');
        update_basics_group_stuff();

        var use_long_names = InstaBucket.get_is_showing_full_names( );
        var use_long_namse_checkbox = document.getElementById( 'basics-status-bar-official-names' );
        use_long_namse_checkbox.checked = use_long_names;

        var is_reloading_on_bucket_change = InstaBucket.get_is_reloading_on_bucket_change( );
        var use_reload = document.getElementById( 'basics-reload-page-on-bucket-change' );
        use_reload.checked = is_reloading_on_bucket_change;

        var is_bucket_cookie = InstaBucket.get_is_bucket_via_cookie();
        var bucket_via_cookie = document.getElementById( 'basics-set-cookie-bucket-change' );
        bucket_via_cookie.checked = is_bucket_cookie;

        var is_bucket_html = InstaBucket.get_is_detect_bucket_via_html();
        var bucket_value_html = document.getElementById( 'basics-get-html-bucket-value' );
        bucket_value_html.checked = is_bucket_html;

        var is_bucket_omn = InstaBucket.get_is_detect_bucket_via_omniture();
        var bucket_value_omniture = document.getElementById( 'basics-get-omniture-bucket-value' );
        bucket_value_omniture.checked = is_bucket_omn;
    }
    catch(e)
    {
        alert('init basics pane:\n' + e);
    }
}

function on_basics_status_bar_official_name()
{
    try
    {
        var use_long_namse_checkbox = document.getElementById( 'basics-status-bar-official-names' );
        var use_long_names = use_long_namse_checkbox.checked;
        InstaBucket.set_is_showing_full_names( use_long_names );

        on_select_basics_group();

        // this fails, because the window is wrong.
        // InstaBucket.refreshInformation( );

        // this hack is to get the status bar to update.
//         var gname = InstaBucket.get_active_group_name();
//         InstaBucket.set_active_group_name( gname );
    }
    catch(e)
    {
        alert('on basic status bar official name:\n' + e);
    }
}

function on_reload_page_on_bucket_change()
{
    try
    {
        var use_reload = document.getElementById( 'basics-reload-page-on-bucket-change' );
        var is_reloading_on_bucket_change = use_reload.checked;
        InstaBucket.set_is_reloading_on_bucket_change( is_reloading_on_bucket_change );
    }
    catch(e)
    {
        alert('on reload page on bucket change:\n' + e);
    }
}

function on_set_cookie_bucket_change()
{
    try
    {
        var bucket_via_cookie = document.getElementById( 'basics-set-cookie-bucket-change' );
        var is_bucket_cookie = bucket_via_cookie.checked;
        InstaBucket.set_is_bucket_via_cookie( is_bucket_cookie );
    }
    catch(e)
    {
        alert('on set cookie bucket change:\n' + e);
    }
}


function on_set_html_bucket_value()
{
    try
    {
        var bucket_value_html = document.getElementById( 'basics-get-html-bucket-value' );
        var is_bucket_html = bucket_value_html.checked;
        InstaBucket.set_is_detect_bucket_via_html(is_bucket_html);
    }
    catch(e)
    {
        alert('**exception**\non set html bucket value:\n' + e);
    }
}

function on_set_omn_bucket_value()
{
    try
    {
        var bucket_value_omniture = document.getElementById( 'basics-get-omniture-bucket-value' );
        var is_bucket_omn = bucket_value_omniture.checked;
        InstaBucket.set_is_detect_bucket_via_omniture(is_bucket_omn);
    }
    catch(e)
    {
        alert('**exception**\non set omn bucket value:\n' + e);
    }
}


function update_basics_group_stuff()
{
    try
    {
        dump('basic group update:\n');

        // grouping-dropdown
        var active_group_name = InstaBucket.get_active_group_name();

        if( active_group_name.length < 1 )
        {
            active_group_name = 'default';
        }
        dump('active group name: ' + active_group_name + '\n');

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

        var grouping_dropdown = document.getElementById( 'basics-grouping-dropdown' );
        grouping_dropdown.removeAllItems();

        var group_names = InstaBucket.get_all_group_names( );

        var select_this_item = null;

        for( var i = 0 ; i < group_names.length ; i ++)
        {
            var gn = group_names[i];
            dump('basics: add group name' + gn + '\n');

            var item = grouping_dropdown.appendItem( gn, gn );

            if( gn == active_group_name )
                select_this_item = item;
        }

//         alert('active group name is: ' + active_group_name );

//         grouping_dropdown.ensureElementIsVisible( select_this_item );
//         grouping_dropdown.selectItem( select_this_item );
        if( null != select_this_item )
            grouping_dropdown.selectedItem = select_this_item;

        on_select_basics_group();
    }
    catch(e)
    {
        alert( 'update group stuff:\n' + e);
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

function on_select_basics_group()
{
    try
    {
        var grouping_dropdown = document.getElementById( 'basics-grouping-dropdown' );

        var group_name = grouping_dropdown.label;
        dump('basics: on select basic group: ' + group_name + '\n');

        var names = InstaBucket.load_group_exp_tla_names( group_name );

        populate_basics_exp_list( names );
    }
    catch(e)
    {
        alert('on select group:\n' + e);
    }
}

function populate_basics_exp_list( names )
{
    try
    {
        var exp_list = document.getElementById('basics-exp-list');
        exp_list.selectedIndex = -1;

        var maxTry = exp_list.itemCount;
        dump('basics: populate list, removing count of: ' + maxTry + '\n');

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

        var show_long_name = document.getElementById('basics-status-bar-official-names').checked;
        dump('basics: show long name option: ' + show_long_name + '\n');

        for( var i = 0 ; i < names.length ; i ++)
        {
            var lookup_name = names[i];
            var view_name = names[i];
            if( show_long_name )
            {
                var eb = InstaBucket.load_exp_pref_tla( lookup_name );
                if( eb == null )
                    continue;
                view_name = eb.full_name;
                view_name = InstaBucket.inject_spaces( view_name );
            }
            exp_list.appendItem(view_name, lookup_name);
        }

        exp_list.selectedIndex = 0;
    }
    catch(e)
    {
        alert('populate basics exp list:\n' + e);
    }
}

// this is also called when the user edits in group tab.
function on_basics_save_group_choice()
{
    try
    {
        var grouping_dropdown = document.getElementById( 'basics-grouping-dropdown' );

        var active_group_name = grouping_dropdown.label;

        InstaBucket.set_active_group_name( active_group_name );
    }
    catch(e)
    {
        alert('on basics save group choice:\n' + e );
    }
}

function on_select_basics_experiment()
{
    try
    {
        var exp_list = document.getElementById('basics-exp-list');
        var eb = null;

        var selection = exp_list.selectedIndex;

        if( selection > -1 )
        {
            var item = exp_list.getItemAtIndex( selection );
            eb = InstaBucket.load_exp_pref_tla( item.value );
        }

//         dump('basics: select experiment');

        if( eb != null )
            dump( ' ' + item.value + '\n' );

        for(var i = 0 ; i < 4 ; i ++)
        {
            var bucket_edit = document.getElementById('basics-bucket-' + i + '-name');
            var b = '';

            if( eb != null )
            {
                b = eb.get_bucket_name(i);
                if( "undefined" == typeof( b ) || b == null )
                    b = '';
            }

//             dump( 'set bucket edit ' + i + ' to: ' + b + '\n' );
            bucket_edit.value = b;
        }
    }
    catch(e)
    {
        alert('on select basics experiment:\n' + e);
    }
}

function on_basics_save_buckets()
{
    try
    {
        var exp_list = document.getElementById('basics-exp-list');
        var selection = exp_list.selectedIndex;
        var item = null;
        var eb = null;

        dump( 'saving buckets of selection: ' + selection + '\n' );

        if( selection > -1 )
        {
            item = exp_list.getItemAtIndex( selection );
            eb = InstaBucket.load_exp_pref_tla( item.value );
            dump( 'item: ' + item.value + ' experiment: ' + eb.tla + '\n' );
        }

        if( eb != null )
        {
            for(var i = 0 ; i < 4 ; i ++)
            {
                var bucket_edit = document.getElementById('basics-bucket-' + i + '-name');

                var b = bucket_edit.value;
                eb.set_bucket_name(i, b);
                dump( 'set bucket name ' + i + ' to: ' + b + '\n' );
            }
            InstaBucket.save_exp_pref( eb );
        }

        // these are saved as soon as the user clicks.

//         var use_long_namse_checkbox = document.getElementById( 'basics-status-bar-official-names' );
//         var use_long_names = use_long_namse_checkbox.checked;
//         InstaBucket.set_is_showing_full_names( use_long_names );

//         var use_reload = document.getElementById( 'basics-reload-page-on-bucket-change' );
//         var is_reloading_on_bucket_change = use_reload.checked;
//         InstaBucket.set_is_reloading_on_bucket_change( is_reloading_on_bucket_change );

//         var bucket_via_cookie = document.getElementById( 'basics-set-cookie-bucket-change' );
//         var is_bucket_cookie = bucket_via_cookie.checked;
//         InstaBucket.set_is_bucket_via_cookie( is_bucket_cookie );
    }
    catch(e)
    {
        alert('on basics save buckets:\n' + e);
    }
}

