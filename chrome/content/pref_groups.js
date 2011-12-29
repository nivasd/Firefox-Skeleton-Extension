
// populate the list of groupings

function init_groups_pane()
{
    try
    {
        dump('init groups pane\n');
//         alert('called init groups pane');
        update_g_group_stuff();
    }
    catch(e)
    {
        alert('init basics pane:\n' + e);
    }
}

// todo: show newly added
// remove those just deleted
function update_g_group_stuff()
{
    try
    {
        var is_experiment_page = InstaBucket.get_show_experiments_based_on_html_content();
        var exp_via_html_check = document.getElementById( 'grouping-use-current-html-experiments-checkbox' );
        dump('set check box  grouping-use-current-html-experiments-checkbox   to: ' + is_experiment_page + '\n');
        exp_via_html_check.checked = is_experiment_page;

        var is_omniture = InstaBucket.get_show_experiments_based_on_omniture_content();
        var exp_via_omn_check = document.getElementById( 'grouping-use-current-omniture-experiments-checkbox' );
        dump('set check box  grouping-use-current-omniture-experiments-checkbox   to: ' + is_omniture + '\n');
        exp_via_omn_check.checked = is_omniture;

        // grouping-dropdown
        var active_group_name = InstaBucket.get_active_group_name();

        var grouping_dropdown = document.getElementById( 'groups-grouping-dropdown' );
        grouping_dropdown.removeAllItems();

        var group_names = InstaBucket.get_all_group_names( );

        for( var i = 0 ; i < group_names.length ; i ++)
        {
            var gn = group_names[i];
            grouping_dropdown.appendItem( gn, gn );
        }

    //     alert('active group name is: ' + active_group_name );
        grouping_dropdown.label = active_group_name;

        on_select_g_group();
    }
    catch(e)
    {
        alert( 'update group stuff:\n' + e);
    }
}

function on_select_g_group()
{
    try
    {
        var grouping_dropdown = document.getElementById( 'groups-grouping-dropdown' );

        var group_name = grouping_dropdown.label;

        var names = InstaBucket.load_group_exp_tla_names( group_name );

        populate_groups_exp_list( names );
    }
    catch(e)
    {
        alert('on select group:\n' + e);
    }
}

function populate_groups_exp_list( names )
{
    try
    {
        for(var i = 0 ; i < 6 ; i ++)
        {
            var edit = document.getElementById('groups-exp-name' + i);
            var n = names[i];
            if( "undefined" == typeof( n ) )
            {
                n = '';
            }
            edit.value = n;
        }
    }
    catch(e)
    {
        alert('populate basics exp list:\n' + e);
    }
}

function on_groups_save()
{
    try
    {
        var grouping_dropdown = document.getElementById( 'groups-grouping-dropdown' );

        var active_group_name = grouping_dropdown.label;

        var names = new Array();

        for(var i = 0 ; i < 6 ; i ++)
        {
            var edit = document.getElementById('groups-exp-name' + i);
            var n = edit.value;
            if( "undefined" == typeof( n ) )
            {
                n = '';
            }
            names.push(n);
        }

        InstaBucket.save_group_exp_tla_names( active_group_name, names );

        // todo: save urls with group.

        init_basics_pane();

        // call into other pane, to update what is currently displayed
        on_basics_save_group_choice();
    }
    catch(e)
    {
        alert('on basics save group choice:\n' + e );
    }
}

function on_remove_grouping_2()
{
    var grouping_dropdown = document.getElementById( 'groups-grouping-dropdown' );
    var group_name = grouping_dropdown.label;

    InstaBucket.delete_group_exp( group_name );

    update_g_group_stuff();

    init_basics_pane();
}

function add_default_groups()
{
    try
    {
        var group_name = 'Infosite';
        var names = new Array();
        names.push('IDRR');
        names.push('BENO');
        names.push('HIVMC');
        names.push('IBV');
        names.push('HEE');
        names.push('HSRDD');

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
    }
    catch(e)
    {
        alert('add_default_groups:\n' + e);
    }
}

function on_add_default_groupings_2()
{
    try
    {
        add_default_groups();

        update_g_group_stuff();
        init_basics_pane();
    }
    catch(e)
    {
        alert('on add default groupings:\n' + e);
    }
}

function groups_add_exp_to_current( experiment )
{
    try
    {
        var found_match = false;
        var open_edit_control = null;
        for(var i = 0 ; i < 6 ; i ++)
        {
            var edit = document.getElementById('groups-exp-name' + i);
            if( null == open_edit_control && edit.value.length < 1 )
            {
                open_edit_control = edit;
            }
            if( edit.value == experiment.tla )
            {
                found_match = true;
            }
        }

        if( !found_match && null != open_edit_control )
        {
            open_edit_control.value = experiment.tla;
            on_groups_save();
        }
    }
    catch(e)
    {
        alert('groups add exp to current:\n' + e);
    }
}

function on_group_use_omniture()
{
    try
    {
        var exp_via_omniture_check = document.getElementById( 'grouping-use-current-omniture-experiments-checkbox' );
        var is_experiment_page = exp_via_omniture_check.checked;
        InstaBucket.set_show_experiments_based_on_omniture_content( is_experiment_page );
    }
    catch(e)
    {
        alert('on group use on omniture:\n' + e);
    }
}

function on_group_use_html()
{
    try
    {
        var exp_via_html_check = document.getElementById( 'grouping-use-current-html-experiments-checkbox' );
        var is_experiment_page = exp_via_html_check.checked;
        InstaBucket.set_show_experiments_based_on_html_content( is_experiment_page );
    }
    catch(e)
    {
        alert('on group use on html:\n' + e);
    }
}


