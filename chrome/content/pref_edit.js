
// alert('pref find js');

// populate the list of groupings

var g_experiment_to_show = null;

var g_pos_ids = new Array();


function init_edit_pane()
{
    try
    {
        var tla = document.getElementById('edit-short-name').value;
        var exp_show = null;

        if( tla.length < 1 )
        {
            tla = InstaBucket.get_active_status_bar_tla()
            exp_show = InstaBucket.load_exp_pref_tla( tla );
        }

//         alert('init edit with tla: ' + tla);

//         alert('called init find pane');
        edit_show_experiment( exp_show );
    }
    catch(e)
    {
        alert('init find pane:\n' + e);
    }
}

function edit_show_experiment( show_me )
{
    try
    {
        g_experiment_to_show = show_me;

        if( "undefined" == typeof( show_me ) ||
            null == show_me )
            {
                dump('edit show: received null experiment to show\n');
                return;
            }

        document.getElementById('edit-full-name').value = show_me.full_name;
        document.getElementById('edit-short-name').value = show_me.tla;

        document.getElementById('edit-bucket-0-name').value = show_me.get_bucket_name(0);
        document.getElementById('edit-bucket-1-name').value = show_me.get_bucket_name(1);
        document.getElementById('edit-bucket-2-name').value = show_me.get_bucket_name(2);
        document.getElementById('edit-bucket-3-name').value = show_me.get_bucket_name(3);

        var is_hidden = InstaBucket.get_is_experiment_hidden( show_me.tla );
        dump('got back hidden value of: ' + is_hidden + '\n' );

        document.getElementById('edit-is-exp-hidden').checked = is_hidden;

        g_pos_ids = new Array();

        for( var pos in show_me.id_pos )
        {
            var id = show_me.get_pos_id( pos );

            g_pos_ids[pos] = id;
        }

        show_pos_ids();
    }
    catch(e)
    {
        alert('edit show exp:\n' + e);
    }
}

function show_pos_ids( pos_select )
{
    try
    {
        pos_list_box = document.getElementById('edit-pos-list');

        var maxTry = pos_list_box.itemCount;

        while( maxTry-- > 0 )
        {
            try
            {
                pos_list_box.removeItemAt(0);
            }
            catch(exception)
            {
                alert("exception removing elements from pos listbox:\n" + exception);
                break;
            }
        }

        var select_this_item = null;

        for( var pos in g_pos_ids )
        {
            var id = g_pos_ids[ pos ];

            if( "undefined" == typeof( id ) || null == id )
                continue;

            var row = document.createElement('listitem');
            row.setAttribute('value', id);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', pos);
            row.appendChild(cell);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', id);
            row.appendChild(cell);

            var appended = pos_list_box.appendChild(row);

            if( pos == pos_select )
            {
                select_this_item = appended;
            }
        }

        if( null != select_this_item )
        {
            pos_list_box.ensureElementIsVisible( select_this_item );
            pos_list_box.selectItem( select_this_item );
        }
    }
    catch(e)
    {
        alert('show pos ids:\n' + e);
    }
}

function on_select_edit_pos()
{
    var list = document.getElementbyId('edit-pos-list');
    var pos = document.getElementById('edit-pos-to-add').value;
    var id  = document.getElementById('edit-id-to-add').value;

    var selected_pos = list.label;

//     var row = document.createElement('listitem');
//     row.setAttribute('value', id);

//     var cell = document.createElement('listcell');
//     cell.setAttribute('label', pos);
//     row.appendChild(cell);

//     var cell = document.createElement('listcell');
//     cell.setAttribute('label', id);
//     row.appendChild(cell);

    // pull values from list control into an array.
    // http://www.webdeveloper.com/forum/showthread.php?t=192830
    var listOfPos = new Array();
    listOfPos.push( list.value );

    var listCount = listOfPos.length;

    dump( 'list count is: ' + listCount );

    for(var i = 0 ; i < listCount ; i ++)
    {
        var listItem = listOfPos[i];
        dump( 'item ' + i + ' = ' + listItem );
    }
}

function on_save_edit_pos()
{
    var pos = document.getElementById('edit-pos-to-add').value;
    var id  = document.getElementById('edit-id-to-add').value;

    g_pos_ids[pos] = id;

    show_pos_ids( pos )
}

function on_remove_edit_pos()
{
    var pos = document.getElementById('edit-pos-to-add').value;

    delete g_pos_ids[pos];

    show_pos_ids()
}

// todo: save everything on the screen?
// or just the buckets.

// todo: remove dead code
function on_edit_save_buckets()
{
    var save_me = new exp_pref_bucket();

    save_me.tla = document.getElementById('edit-short-name').value;
    save_me.full_name = document.getElementById('edit-long-name').value;

    var b0 = document.getElementById('edit-bucket-0-name').value;
    var b1 = document.getElementById('edit-bucket-1-name').value;
    var b2 = document.getElementById('edit-bucket-2-name').value;
    var b3 = document.getElementById('edit-bucket-3-name').value;

    // todo: how to get the pos id stuff out of the list box
    // todo: use a global and store the key value pairs
    // then update the GUI to show what is in memory.

    g_experiment_to_show.set_bucket_name(0, b0);
    g_experiment_to_show.set_bucket_name(1, b1);
    g_experiment_to_show.set_bucket_name(2, b2);
    g_experiment_to_show.set_bucket_name(3, b3);

}

function on_edit_save()
{
    try
    {
        var full_name = document.getElementById('edit-full-name').value;
        var short_name = document.getElementById('edit-short-name').value;

        var bucket0 = document.getElementById('edit-bucket-0-name').value;
        var bucket1 = document.getElementById('edit-bucket-1-name').value;
        var bucket2 = document.getElementById('edit-bucket-2-name').value;
        var bucket3 = document.getElementById('edit-bucket-3-name').value;

        var expr = new exp_pref_bucket();

        expr.full_name = full_name;
        expr.tla = short_name;

        expr.set_bucket_name( 0, bucket0 );
        expr.set_bucket_name( 1, bucket1 );
        expr.set_bucket_name( 2, bucket2 );
        expr.set_bucket_name( 3, bucket3 );

        var is_hidden = document.getElementById('edit-is-exp-hidden').checked;
        dump('on edit save: set is hidden for <' + expr.tla + '> to: ' + is_hidden + '\n');
        InstaBucket.hide_experiment( expr.tla, is_hidden );

        for( var pos in g_pos_ids )
        {
            var id = g_pos_ids[ pos ];
            if( "undefined" == typeof( id ) || null == id )
                continue;
            expr.set_pos_id( pos, id );
        }

        InstaBucket.save_exp_pref( expr );

    }
    catch(e)
    {
        alert('on edit save:\n' + e);
    }

}

