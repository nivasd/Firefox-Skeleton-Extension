/*

    user wants to change what group of experiments is showing

    loading values from here:

        InstaBucket.Grouping0.name
        InstaBucket.Grouping0.tla0
        InstaBucket.Grouping0.tla1
        InstaBucket.Grouping0.tla2

    setting values here:

        InstaBucket.experiment0.tla

 */

prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService)
        .getBranch("InstaBucket.");
prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);

function on_window_load()
{

    var grouping_dropdown = document.getElementById( 'grouping-dropdown' );

    grouping_dropdown.removeAllItems();

    var names = get_all_group_names();

    // todo, set the combo to match what is showing.
    for( var i = 0 ; i < names.length ; i ++)
    {
        var n = names[i];
        if( n.length > 0 )
            grouping_dropdown.appendItem( n, n );
    }

    var current_name = get_active_group_name();

    grouping_dropdown.label = current_name;
}

function on_pane_load()
{
}

// todo: show experiments that are in this group
// provide button to change the experiments.
function on_select_group()
{
}

function on_window_accept()
{
    try
    {
        // get value from drop down
        // based on drop down text, load experiment names from prefs
        // save those prefs to the ones associated with the status bar.

        for(var i = 0 ; i < 20 ; i++)
        {
            dump('*\n');
        }
        dump('group popup selection completed\n');


        var grouping_dropdown = document.getElementById( 'grouping-dropdown' );

        var choice = grouping_dropdown.label;

//         alert( 'choice = ' + choice );

        var exp_to_use = load_experiment_names( choice );

        set_active_group_name( choice );

        set_display_names( exp_to_use );

        // if we return false, it should not go away.
        // but it does anyway.
        // return false;
    }
    catch(e)
    {
        alert('on window accept:\n' + e);
    }

    return true;
}

function set_active_group_name( group_name )
{
    var save_name = 'Grouping.Active.name';
    prefs.setCharPref( save_name, group_name );
}

function get_active_group_name( )
{
    var group_name = '';
    var save_name = 'Grouping.Active.name';
    if( prefs.prefHasUserValue( save_name ) )
        group_name = prefs.getCharPref( save_name );

    return group_name;
}

function get_all_group_names()
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
            if( prefs.prefHasUserValue( save_name ) )
            {
                var g_name = prefs.getCharPref( save_name );
                names.push( g_name );
            }
        }
    }
    catch(e)
    {
        alert(' get all group names:\n' + e);
    }
    return names;
}

function load_experiment_names( group_name )
{
    var names = new Array();
    var active_group_index;

    for( var i = 0 ; i < 10 ; i ++)
    {
        var save_name = 'Grouping' + i + '.name';
        if( prefs.prefHasUserValue( save_name ) )
        {
            var g_name = prefs.getCharPref( save_name );
            if( g_name == group_name )
            {
                active_group_index = i;
                break;
            }
        }
        save_name = '';
    }

    // todo: save somewhere showing what the active group name is.

    for( var i = 0 ; i < 10 ; i ++)
    {
        var save_name = 'Grouping' + active_group_index + '.tla' + i;

        if( prefs.prefHasUserValue( save_name ) )
        {
            var tla = prefs.getCharPref( save_name );
            names.push( tla );
        }
    }

    // hack to fill in the last few with blanks.
    names.push('');
    names.push('');
    names.push('');
    names.push('');
    names.push('');
    names.push('');

    return names;
}

// status bar is set to watch for pref changes,
// and update based on what is set.
// InstaBucket.experiment0.tla
//
function set_display_names( names )
{
    for( var i = 0 ; i < names.length ; i ++)
    {
        var savename = 'experiment' + i + '.tla';
        prefs.setCharPref(savename, names[i] );
    }
}

