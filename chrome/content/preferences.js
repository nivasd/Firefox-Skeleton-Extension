/*

    Insta Bucket

script for preferences dialog.
opened from status bar right click config
or tools | add ons | Instabucket | Options

    on_select_experiment();
    on_save_pos_id()
    on_add_exp
    on_remove_exp


 */
var g_no_update = false;

var interval_to_use;

var max_ticks = 10;
function on_pane_load()
{
//     alert( ' on pane load ' );

    update_page_content();

    max_ticks = 5;
    interval_to_use = window.setInterval(on_clock_tick, 1000);
}


function on_clock_tick()
{
//     alert('on clock tick');

    // wait a second for the dialog to draw
    var tla = InstaBucket.get_active_status_bar_tla();
    var active_item = select_experiment( tla );

    if( active_item > -1 || max_ticks-- < 1 )
    {
        window.clearInterval(interval_to_use);
//         alert( 'seeking ' + tla + ' found selected index = ' + active_item );
    }
}

function on_window_load()
{
//      alert('on window load');
//     update_page_content();

    update_group_stuff();

    var is_showing_full_names = InstaBucket.get_is_showing_full_names();
    var use_long_namse_checkbox = document.getElementById( 'status-bar-official-names' );
    use_long_namse_checkbox.checked = is_showing_full_names;

    var is_reloading_on_bucket_change = InstaBucket.get_is_reloading_on_bucket_change();
    var use_reload = document.getElementById( 'reload-page-on-bucket-change' );
    use_reload.checked = is_reloading_on_bucket_change;

}

function prepare_default_grouping( group_name )
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

function update_group_stuff()
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

        var grouping_dropdown = document.getElementById( 'grouping-dropdown' );
        grouping_dropdown.removeAllItems();

        var group_names = InstaBucket.get_all_group_names( );

        for( var i = 0 ; i < group_names.length ; i ++)
        {
            var gn = group_names[i];
            grouping_dropdown.appendItem( gn, gn );
        }

    //     alert('active group name is: ' + active_group_name );
        grouping_dropdown.label = active_group_name;

        on_select_group();
    }
    catch(e)
    {
        alert( 'update group stuff:\n' + e);
    }
}

function on_window_accept()
{
    try
    {
        var use_long_namse_checkbox = document.getElementById( 'status-bar-official-names' );
        var use_long_names = use_long_namse_checkbox.checked;
        InstaBucket.set_is_showing_full_names( use_long_names );

        var use_reload = document.getElementById( 'reload-page-on-bucket-change' );
        var is_reloading_on_bucket_change = use_reload.checked;
        InstaBucket.set_is_reloading_on_bucket_change(is_reloading_on_bucket_change);

        // if controls are set programatically, then 'OK' doesn't save them.
        var names = get_visible_exp_names( );

        for( var i = 0 ; i < names.length ; i ++)
        {
            InstaBucket.set_exp_pref_index( i, names[i] );
        }

        var grouping_dropdown = document.getElementById( 'grouping-dropdown' );

        var active_group_name = grouping_dropdown.label;

        InstaBucket.set_active_group_name( active_group_name );

    }
    catch(e)
    {
        alert('on window accept:\n' + e);
    }
    return true;
}

function on_load_all()
{
    update_page_content();
}

function on_select_group()
{
    try
    {
        var grouping_dropdown = document.getElementById( 'grouping-dropdown' );

        var group_name = grouping_dropdown.label;

        var names = InstaBucket.load_group_exp_tla_names( group_name );

        set_visible_exp_names( names );
    }
    catch(e)
    {
        alert('on select group:\n' + e);
    }
}

function on_save_grouping()
{
    var grouping_dropdown = document.getElementById( 'grouping-dropdown' );
    var group_name = grouping_dropdown.label;

    var names = get_visible_exp_names( );

    InstaBucket.save_group_exp_tla_names( group_name, names );

    update_group_stuff();
}

function on_remove_grouping()
{
    var grouping_dropdown = document.getElementById( 'grouping-dropdown' );
    var group_name = grouping_dropdown.label;

    InstaBucket.delete_group_exp( group_name );

    update_group_stuff();
}

function on_add_default_groupings()
{
    try
    {
        var group_name = 'Infosite';
        var names = new Array();
        names.push('IDRR');
        names.push('BEXPR');
        names.push('IV');
        names.push('IMP');
        names.push('IBNO');

        InstaBucket.save_group_exp_tla_names( group_name, names );

        group_name = 'Packages';
        names = new Array();
        names.push('PCSSFITIN');
        names.push('PDPSR');
        names.push('PUM');

        InstaBucket.save_group_exp_tla_names( group_name, names );

        group_name = 'Flights';
        names = new Array();
        names.push('AUIIP');
        names.push('FRI');
        names.push('GA');
        names.push('RWFS');
        names.push('SFI');

        InstaBucket.save_group_exp_tla_names( group_name, names );

        group_name = 'Hotel Search';
        names = new Array();
        names.push('HSRDD');
        names.push('HU');
        names.push('HEE');

        InstaBucket.save_group_exp_tla_names( group_name, names );

        update_group_stuff();
    }
    catch(e)
    {
        alert('on add default groupings:\n' + e);
    }
}

function on_status_bar_official_name()
{
}

function get_visible_exp_names( )
{
    var names = new Array();

    for( var i = 0 ; i < 10 ; i ++)
    {
        var exp_display_name_edit = document.getElementById( 'exp-name' + i );
        if( "undefined" == typeof( exp_display_name_edit ) ||
            null == exp_display_name_edit )
            {
                break;
            }
        var exp_name = exp_display_name_edit.value;

//         if( exp_name.length > 0 )
            names.push( exp_name );
    }

    return names;
}

function set_visible_exp_names( names )
{
    if( names.length < 1 )
        return;

    var has_some_content = false;

    for( var i = 0 ; i < 10 ; i ++)
    {
        var exp_name = names[i];
        if( "undefined" == typeof( exp_name ) )
            continue;
        if( exp_name.length < 1 )
            continue;
        has_some_content = true;
        break;
    }

    if( !has_some_content )
        return;

    for( var i = 0 ; i < 10 ; i ++)
    {
        var exp_display_name_edit = document.getElementById( 'exp-name' + i );
        if( "undefined" == typeof( exp_display_name_edit ) ||
            null == exp_display_name_edit )
            {
                break;
            }
        var exp_name = names[i];

        if( "undefined" == typeof( exp_name ) )
            exp_name = '';

        exp_display_name_edit.value = exp_name;
    }
}

function on_reset_all()
{
    delete_all_preferences();
}

function select_experiment( tla )
{
    var result = -1;
    try
    {
        var tla_list_box = document.getElementById("exp-list");

        var count = tla_list_box.itemCount;

        for(var i = 0 ; i < count ; i ++)
        {
            var item = tla_list_box.getItemAtIndex( i );

//             alert('looking for ' + tla + ' found: \nvalue:' + item.value + "\nlabel:" + item.label );

            if( item.value == tla ||
                item.label == tla )
            {
                tla_list_box.focus();
                tla_list_box.ensureIndexIsVisible( i );
                tla_list_box.selectedIndex = i;
                result = i;
                on_select_experiment();
                break;
            }
        }
    }
    catch(e)
    {
        alert('select experiment:\n' + e);
    }
    return result;
}

function delete_all_preferences()
{
    try
    {
        InstaBucket.delete_all_prefs( );

        for(var i = 0 ; i < 6 ; i++)
        {
            var root = 'exp-name';
            var edit_box = document.getElementById( root + i );
            if( null == edit_box || "undefined" == typeof( edit_box ) )
                continue;
            edit_box.value = '';
            edit_box.label = '';
        }

        update_page_content();
    }
    catch(e)
    {
        alert('delete all preferences:\n' + e);
    }
}

function on_remove_exp()
{
    try
    {
        var tla_list_box = document.getElementById("exp-list");
        // var active_tla = tla_list_box.selectedIndex;

        var tla = tla_list_box.value;

        InstaBucket.delete_exp_pref( tla );

        update_page_content();
    }
    catch(e)
    {
        alert('on remove exp:\n' + e);
    }
}

function on_save_exp()
{
    try
    {
        dbgOut.print('hello world, tracing message');

        var full_name = document.getElementById("exp-full-name").value;
        var tla = document.getElementById("exp-short-name").value;

        var pos_combo = document.getElementById("pos-dropdown");

        var bucket_0 = document.getElementById("bucket-0-name").value;
        var bucket_1 = document.getElementById("bucket-1-name").value;
        var bucket_2 = document.getElementById("bucket-2-name").value;
        var bucket_3 = document.getElementById("bucket-3-name").value;

//         var pos = document.getElementById("pos-name-textbox").value;
        var pos = document.getElementById("pos-dropdown").label;
        var id = document.getElementById("exp-id-textbox").value;

        var eb = InstaBucket.load_exp_pref_tla( tla );
        if( eb == null || "undefined" == typeof( eb ) )
        {
            // if we always create a new one, then we lose the pos
            eb = new exp_pref_bucket();
        }

        eb.tla = tla;
        eb.full_name = full_name;

        eb.set_bucket_name( 0, bucket_0 );
        eb.set_bucket_name( 1, bucket_1 );
        eb.set_bucket_name( 2, bucket_2 );
        eb.set_bucket_name( 3, bucket_3 );

        eb.set_pos_id( pos, id );

//         for( var pi in pos_combo.itemCount )
//         {
//             var pos_item = pos_combo.getItemAtIndex(pi);
//             var pos = pos_item.label;
//             var id = pos_item.value;

//             eb.set_pos_id( pos, id );
//         }

        InstaBucket.save_exp_pref( eb );

        update_page_content();
    }
    catch(e)
    {
        alert('on save exp:\n' + e);
    }
}

function on_select_experiment()
{
    try
    {
        if( g_no_update )
            return;

        var tla_list_box = document.getElementById("exp-list");
        // var active_tla = tla_list_box.selectedIndex;

        var tla = tla_list_box.value;

        var exp_pref = InstaBucket.load_exp_pref_tla( tla );

//         alert( exp_pref.dump() );


        document.getElementById("exp-full-name").value = exp_pref.full_name;
        var tla = document.getElementById("exp-short-name").value = exp_pref.tla;

        var pos_combo = document.getElementById("pos-dropdown");
//         var current_item = pos_combo.label;
//         var current_item = document.getElementById("pos-name-textbox").value;
        var current_item = document.getElementById("pos-dropdown").label;

        pos_combo.removeAllItems();
        var added_to_select = null;

        for( var p in exp_pref.id_pos )
        {
            var added = pos_combo.appendItem( p, exp_pref.id_pos[ p ] );

            if( current_item == p )
            {
                added_to_select = added;
            }
        }

        if( added_to_select != null )
        {
            pos_combo.selectedItem = added_to_select;
        }
        else
        {
            pos_combo.selectedIndex = 0;
        }
        on_select_pos();

        document.getElementById("bucket-0-name").value = exp_pref.get_bucket_name(0);
        document.getElementById("bucket-1-name").value = exp_pref.get_bucket_name(1);
        var b2 = exp_pref.get_bucket_name(2);
        if( "undefined" != typeof( b2 ) )
            document.getElementById("bucket-2-name").value = b2;
        var b3 = exp_pref.get_bucket_name(3);
        if( "undefined" != typeof( b3 ) )
            document.getElementById("bucket-3-name").value = b3;

        document.getElementById("abacus-details").value = exp_pref.get_abacus_details();
    }
    catch(e)
    {
        // alert('on select experiment:\n' + e);
    }
}

function on_list_by_long_name()
{
    try
    {
        var checked_true = document.getElementById('show-long-names').checked;

//         alert('check box now has value of: ' + checked_true);
    }
    catch(e)
    {
        alert('on list by long name :\n' + e);
    }
}

function on_select_pos_count()
{
    try
    {
        var checked_true = document.getElementById('pos-count-check').checked;
        // maybe do something, for now only filter when loading saved items.

//         alert('check box now has value of: ' + checked_true );
    }
    catch(e)
    {
        alert('on select pos count:\n' + e );
    }
}

function on_select_pos_us()
{
        var checked_true = document.getElementById('pos-us-check').checked;
        // maybe do something, for now only filter when loading saved items.

//         alert('check box now has value of: ' + checked_true );

}

function on_select_pos()
{
    try
    {
        var pos_combo = document.getElementById("pos-dropdown");
        // var active_tla = tla_list_box.selectedIndex;

        var pos = pos_combo.label;
        var id = -1;

        // editable combo guys do not store a value.
//         var id = pos_combo.value;

        var tla_list_box = document.getElementById("exp-list");
        var tla = tla_list_box.value;
        var exp_pref = InstaBucket.load_exp_pref_tla( tla );

        if( null != exp_pref && "undefined" != typeof( exp_pref ) )
        {
            id = exp_pref.get_pos_id( pos );
        }

//         document.getElementById("pos-name-textbox").value = pos;
        document.getElementById("exp-id-textbox").value = id;
    }
    catch(e)
    {
        alert('on select pos:\n' + e);
    }
}

function update_page_content( )
{
    g_no_update = true;
    var step = 'a';
    try
    {
        var tla_list_box = document.getElementById("exp-list");
        var active_index = tla_list_box.selectedIndex;

        var show_long_names = document.getElementById('show-long-names').checked;
        var filter_out_1_pos_exp = document.getElementById('pos-count-check').checked;
        var filter_out_non_us_exp = document.getElementById('pos-us-check').checked;
        var filter_match_id = document.getElementById('id-match-check').checked;
        var id_to_match = document.getElementById('id-match-textbox').value;
        var filter_match_name = document.getElementById('name-match-check').checked;
        var name_to_match = document.getElementById('name-match-textbox').value;
        name_to_match = name_to_match.toLowerCase();

        var maxTry = tla_list_box.itemCount;

        while( maxTry-- > 0 )
        {
            try
            {
                tla_list_box.removeItemAt(0);
            }
            catch(exception)
            {
                alert("exception removing elements from tla listbox:\n" + exception);
                break;
            }
        }

        var complete_tla_list = InstaBucket.load_all_exp_tla_names();
        complete_tla_list.sort();


//         alert( 'update page content, count: ' + complete_tla_list.length );
//         alert( 'update page content, list: ' + complete_tla_list );

        for(var i in complete_tla_list)
        {
            var tla = complete_tla_list[i];

            // todo fix list provider.
            if( tla.length < 1 )
                continue;

            var exp_obj = InstaBucket.load_exp_pref_tla( tla );
            if( "undefined" == typeof( exp_obj ) || null == exp_obj )
            {
                alert('exp obj for ' + tla + ' is null or undef' );
                continue;
            }

            if( filter_out_1_pos_exp )
            {
                if( exp_obj.get_pos_count() < 2 )
                {
//                     alert('count for ' + tla + ' is: ' + exp_obj.get_pos_count() );
                    continue;
                }
            }

            if( filter_out_non_us_exp )
            {
                if( exp_obj.get_pos_id( 'US' ) < 0 )
                {
//                     alert('exp obj for ' + tla + ' does not have us pos' );
                    continue;
                }
            }

            if( filter_match_name )
            {
                var found = exp_obj.full_name.toLowerCase().indexOf( name_to_match );

                if( found < 0 )
                    continue;
            }

            if( filter_match_id )
            {
                var found_match = false;
                for( var pos in exp_obj.id_pos )
                {
                    var exp_id = exp_obj.id_pos[pos];
                    if( exp_id != id_to_match )
                    {
                        continue;
                    }

                    // special case, once a match is found, we are done.
                    var label_text = tla;
                    var value_text = tla;
                    if( show_long_names )
                    {
                        label_text = exp_obj.full_name;
                    }
                    tla_list_box.appendItem(label_text, value_text);

                    found_match = true;
                    break;
                }
                if( found_match )
                    break;

                continue;
            }


//             alert( ' tla: ' + tla );

            var label_text = tla;
            var value_text = tla;
            if( show_long_names )
            {
                label_text = exp_obj.full_name;
            }
            tla_list_box.appendItem(label_text, value_text);
        }

        if( active_index == null ||
            typeof( active_index ) == "undefined" ||
            active_index < 0 )
        {
            active_index = 0;
        }

        while( active_index >= tla_list_box.itemCount )
        {
            active_index--;
        }

        if( active_index > -1 )
        {
            tla_list_box.focus();
            tla_list_box.ensureIndexIsVisible( active_index );
            tla_list_box.selectedIndex = active_index;
            g_no_update = false;
            on_select_experiment();
        }
    }
    catch(e)
    {
        alert("update page content step: " + step + ":\n" + e);
    }
    g_no_update = false;
}

