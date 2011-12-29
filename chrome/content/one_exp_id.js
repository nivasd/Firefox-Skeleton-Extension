/*

    user wants to enter a single id, maybe a point of sale
    use this experiment id

 */

function on_window_load()
{
}

function on_pane_load()
{
}

function on_select_pos()
{
//     var check_pos = document.getElementById( 'current-pos-check' );

//     document.getElementById('pos-for-id').disabled = check_pos.checked;
}

function on_window_accept()
{
    try
    {
        var use_current_pos = document.getElementById( 'current-pos-check' ).checked;
        var id = document.getElementById( 'id-to-watch' ).value;
        var pos = document.getElementById( 'pos-for-id' ).value;

        InstaBucket.add_quick_set_id( id, pos );

        // if we return false, it should not go away.
        // but it does anyway.
        // return false;
        return true;
        // return check_pos.checked;
    }
    catch(e)
    {
        alert('on window accept:\n' + e);
    }
}


