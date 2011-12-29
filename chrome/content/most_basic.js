
dump('loading most basic.js\n');

function most_basic_menu_command()
{
    alert('hello from menu');
}


function on_open_small_menu(status_bar_index)
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

        // this.set_active_status_bar_item( this.status_bar_index_selcted );

        // full menu takes precedence over small menu.
        if( !showing_full_menu )
            this.open_menu( status_bar_index, node_id, menu_id_small );
    }
    catch(e)
    {
        alert('on open small menu:' + e );
    }
}

function on_open_full_menu(status_bar_index)
{
    try
    {
        var node_id = 'insta-bucket-' + status_bar_index;
        var menu_id_small = 'bucket-context-menu';
        var menu_id_full = 'full-feature-context-menu';

        var showing_small_menu = document.getElementById( menu_id_small ).
            state == "open";

        document.getElementById( menu_id_small ).hidePopup();

        this.open_menu( status_bar_index, node_id, menu_id_full );
    }
    catch(e)
    {
        alert('on open full menu:' + e);
    }
}

function open_menu( status_bar_index, status_bar_node_id, menu_id )
{
    try
    {
        var status_bar_node = document.getElementById(status_bar_node_id);

        var menu_to_open = document.getElementById( menu_id );

        // var position = "end_before";
        var position = "after_start";
        menu_to_open.openPopup( status_bar_node, position, 0, 0, true, false);
    }
    catch(e)
    {
        alert('open context menu:\n' + e);
    }
}
