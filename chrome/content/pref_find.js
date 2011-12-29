
// alert('pref find js');

// populate the list of groupings

function init_find_pane()
{
    try
    {
        var tla = document.getElementById('edit-short-name').value;
        var exp_show = null;

        document.getElementById('find-is-hidden-checkbox').checked = false;

        dump('preferences find, tla = ' + tla + '\n');
        if( tla.length < 1 )
        {
            tla = InstaBucket.get_active_status_bar_tla()
            exp_show = InstaBucket.load_exp_pref_tla( tla );
        }

//         alert('called init find pane');
        show_experiments( exp_show );
    }
    catch(e)
    {
        alert('init find pane:\n' + e);
    }
}

function on_find_2_pos_match()
{
    show_experiments();
}

function on_find_us_pos_match()
{
    show_experiments();
}

function on_find_id_match()
{
    show_experiments();
}

function on_find_id_greater()
{
    show_experiments();
}

function on_find_name_match()
{
    show_experiments();
}

function on_find_abacus_match()
{
    show_experiments();
}

function on_find_show_hidden()
{
    show_experiments();
}

function on_show_long_name()
{
    show_experiments();
}

function on_show_id()
{
    show_experiments();
}

// todo: show newly added
// remove those just deleted
function show_experiments( show_me )
{
    try
    {
        dump('pref find: show experiment: ' + show_me + '\n' );
        var tla_list_box = document.getElementById("find-exp-list");
        var active_index = tla_list_box.selectedIndex;

        var filter_out_1_pos_exp = document.getElementById('find-2-pos-checkbox').checked;
        var filter_out_non_us_exp = document.getElementById('find-us-pos-checkbox').checked;
        var filter_id_min = document.getElementById('find-id-larger-textbox').value;
        var name_to_match = document.getElementById('find-name-match-textbox').value;
        var abacus_to_match = document.getElementById('find-abacus-match-textbox').value;

        var item_to_select = null;
        var tla_to_select = null;
        if( null != show_me && "undefined" != typeof( show_me ) )
        {
            tla_to_select = show_me.tla;
        }

        name_to_match = name_to_match.toLowerCase();
        abacus_to_match = abacus_to_match.toLowerCase();

        var filter_match_name = ( name_to_match.length > 0 );
        var filter_match_id = ( filter_id_min.length > 0 );
        var filter_match_abaucs = ( abacus_to_match.length > 0 );

        var show_long_names = document.getElementById('find-show-long-name-checkbox').checked;
        var show_id = false;
        try
        {
            show_id = document.getElementById('find-show-id-checkbox').checked;
        }
        catch(e)
        {
        }

        var show_hidden_exps = document.getElementById('find-is-hidden-checkbox').checked;

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
        if( show_id )
        {
            // copy the else block
            // change to add items in the order of ids
            // and show all ids in the list

            // given an index, get back the experiment tla
            var tla_lookup = new Array();
            var exp_ids = new Array();

            for(var i in complete_tla_list)
            {
                var tla = complete_tla_list[i];
                // todo fix list provider.
                if( tla.length < 1 )
                    continue;

                if( show_hidden_exps && !InstaBucket.get_is_experiment_hidden( tla ) )
                {
                    dump('not showing experiment <' + tla + '> because it is not hidden\n');
                    continue;
                }

                var exp_obj = InstaBucket.load_exp_pref_tla( tla );
                if( "undefined" == typeof( exp_obj ) || null == exp_obj )
                {
    //                 alert('exp obj for ' + tla + ' is null or undef' );
                    continue;
                }

                for( var pos in exp_obj.id_pos )
                {
                    var id = exp_obj.id_pos[ pos ];
                    tla_lookup[id] = tla;
                    exp_ids.push( id );
                    dump( 'id: ' + id + ' = tla: ' + tla + ' tla_lookup[id] = ' + tla_lookup[id] + '\n' );
                }
            }

            // now that we have all the ids, sort them, and populate the listbox

            exp_ids.sort();

            for(var id_in_order in exp_ids)
            {
                var tla = tla_lookup[id_in_order];
                var id_first_found = -1;

                dump( 'after sort : id = ' + id_in_order + ' tla = ' + tla + '\n' );

                // todo fix list provider.
                if( !tla || tla.length < 1 )
                {
                    dump( ' tla is null or not there, skip to next id = ' + id_in_order + '\n' );
                    continue;
                }

                var exp_obj = InstaBucket.load_exp_pref_tla( tla );
                if( "undefined" == typeof( exp_obj ) || null == exp_obj )
                {
    //                 alert('exp obj for ' + tla + ' is null or undef' );
                    dump( ' id: ' + id_in_order + ' give null experiment: tla ' + tla + '\n' );
                    continue;
                }

                if( filter_out_1_pos_exp )
                {
                    if( exp_obj.get_pos_count() < 2 )
                    {
    //                     alert('count for ' + tla + ' is: ' + exp_obj.get_pos_count() );
                        dump( ' filter out this experiment, not enough pos : ' + tla + '\n' );
                        continue;
                    }
                }

                if( filter_out_non_us_exp )
                {
                    if( exp_obj.get_pos_id( 'US' ) < 0 )
                    {
    //                     alert('exp obj for ' + tla + ' does not have us pos' );
                        dump( ' filter out this experiment, not in US\n' );
                        continue;
                    }
                }

                if( filter_match_name )
                {
                    var content = exp_obj.full_name;
                    var found = content.toLowerCase().indexOf( name_to_match );

                    if( found < 0 )
                    {
                        dump( ' filter out this name, no match + ' + content + '\n' );
                        continue;
                    }
                }

                if( filter_match_abaucs )
                {
                    var content = exp_obj.get_abacus_details();
                    var found = content.toLowerCase().indexOf( abacus_to_match );

                    if( found < 0 )
                    {
                        dump( ' filter out this name, no match + ' + content + '\n' );
                        continue;
                    }
                }

                if( filter_match_id )
                {
                    var found_one_larger = false;

                    var len_desired = filter_id_min.length;

                    if( id_in_order < filter_id_min )
                    {
                        dump( ' filter out this id, too low: ' + id_in_order + '\n' );
                        continue;
                    }
                }


                var label_text = tla;
                var value_text = tla;

                if( show_long_names )
                {
                    label_text = exp_obj.full_name;
                }
                if( show_id )
                {
                    label_text = id_in_order + '   ' + label_text;
                }
                var appended = tla_list_box.appendItem(label_text, value_text);
                if( value_text == tla_to_select )
                {
                    item_to_select = appended;
                }
            }

        }
        else
        {
            complete_tla_list.sort();

            for(var i in complete_tla_list)
            {
                var tla = complete_tla_list[i];
                var id_first_found = -1;

                // todo fix list provider.
                if( !tla || tla.length < 1 )
                    continue;

                if( show_hidden_exps && !InstaBucket.get_is_experiment_hidden( tla ) )
                {
                    dump('not showing experiment <' + tla + '> because it is not hidden\n');
                    continue;
                }

                var exp_obj = InstaBucket.load_exp_pref_tla( tla );
                if( "undefined" == typeof( exp_obj ) || null == exp_obj )
                {
    //                 alert('exp obj for ' + tla + ' is null or undef' );
                    continue;
                }

                if( filter_out_1_pos_exp )
                {
                    if( !exp_obj.get_pos_count || exp_obj.get_pos_count() < 2 )
                    {
    //                     alert('count for ' + tla + ' is: ' + exp_obj.get_pos_count() );
                        continue;
                    }
                }

                if( filter_out_non_us_exp )
                {
                    if( !exp_obj.get_pos_id || exp_obj.get_pos_id( 'US' ) < 0 )
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

                if( filter_match_abaucs )
                {
                    var content = exp_obj.get_abacus_details();
                    var found = content.toLowerCase().indexOf( abacus_to_match );

                    if( found < 0 )
                        continue;
                }

                if( filter_match_id )
                {
                    var found_one_larger = false;
                    // todo: how to compare numbers?

                    var len_desired = filter_id_min.length;
                    for( var pos in exp_obj.id_pos )
                    {
                        var exp_id = "0";
                        if( exp_obj.id_pos )
                        {
                            exp_id = exp_obj.id_pos[pos];
                        }

                        while( exp_id.length < len_desired )
                        {
                            exp_id = "0" + exp_id;
                        }

                        id_first_found = exp_id;

                        if( exp_id.length > len_desired ||
                            exp_id >= filter_id_min )
                        {
                            found_one_larger = true;
                            break;
                        }
                    }
                    if( !found_one_larger )
                        continue;
                }


    //             alert( ' tla: ' + tla );

                var label_text = tla;
                var value_text = tla;
                if( show_long_names )
                {
                    label_text = exp_obj.full_name;
                }
                if( show_id )
                {
                    label_text = id_first_found + '   ' + label_text;
                }
                var appended = tla_list_box.appendItem(label_text, value_text);
                if( value_text == tla_to_select )
                {
                    item_to_select = appended;
                }
            }
        }

        // nope, but would be helpful
        // tla_list_box.sort();

        if( item_to_select != null )
        {
            tla_list_box.ensureElementIsVisible( item_to_select );
//             tla_list_box.selectItem( item_to_select );
            tla_list_box.timedSelect( item_to_select, 2000 );
        }

        // when loading the list box, we cannot search it... not finding a hit.
//         select_experiment( show_me );

    }
    catch(e)
    {
        alert( 'show experiments:\n' + e);
    }
}

function select_experiment( show_me )
{
    try
    {
//         var debug_message = '';
        if( null == show_me || "undefined" == typeof( show_me ) )
            return;

        var tla = show_me.tla;

//         alert( ' find: selecting experiment: ' + tla );
//         debug_message += ' find: selecting experiment: ' + tla;

        var exp_list = document.getElementById( 'find-exp-list' );
        var count = exp_list.itemCount;

        for(var i = 0 ; i < count ; i ++)
        {
            var item = exp_list.getItemAtIndex(i);
            if( item.value == tla )
            {
//                 alert( ' found: ' + item.label + ', ' + item.value );
//                 debug_message += '\n found: ' + item.label + ', ' + item.value;
                exp_list.ensureElementIsVisible( item );
                exp_list.selectItem( item );
                exp_list.timedSelect( item, 2000 );
            }
        }
//         document.getElementById('find-abacus-details').value = debug_message;
    }
    catch(e)
    {
        alert('select experiment:\n' + e);
    }
}

function on_select_experiment_find()
{
    try
    {
        var exp_list = document.getElementById( 'find-exp-list' );

        var cur_tla = exp_list.value;

        var ex = InstaBucket.load_exp_pref_tla( cur_tla );
        if( null == ex )
            return;

//         populate_pos_ids_list( ex );

        var abacus_details = ex.get_abacus_details();

        if( abacus_details.length < 5 )
        {
            for( var pos in ex.id_pos )
            {
                var id = ex.id_pos[pos];

                abacus_details += pos + '  =  ' + id + '\n';
            }
        }

        abacus_details = ex.tla + "  " + ex.full_name + "\n" + abacus_details;

        document.getElementById('find-abacus-details').value = abacus_details;
    }
    catch(e)
    {
        alert('on select group:\n' + e);
    }
}

// function populate_pos_ids_list( experiment )
// {
//     try
//     {
//         if( experiment == null )
//             return;

//         var pos_list_box = document.getElementById( 'find-pos-list' );

//         var maxTry = pos_list_box.itemCount;

//         while( maxTry-- > 0 )
//         {
//             try
//             {
//                 pos_list_box.removeItemAt(0);
//             }
//             catch(exception)
//             {
//                 alert("exception removing elements from pos listbox:\n" + exception);
//                 break;
//             }
//         }

//         for( var pos in experiment.id_pos )
//         {
//             var id = experiment.get_pos_id( pos );

//             var row = document.createElement('listitem');
//             row.setAttribute('value', id);

//             var cell = document.createElement('listcell');
//             cell.setAttribute('label', pos);
//             row.appendChild(cell);

//             var cell = document.createElement('listcell');
//             cell.setAttribute('label', id);
//             row.appendChild(cell);

//             pos_list_box.appendChild(row);
//         }
//     }
//     catch(e)
//     {
//         alert('populate pos ids list:\n' + e);
//     }
// }

function on_find_use()
{
    try
    {
        var exp_list = document.getElementById( 'find-exp-list' );

        var cur_tla = exp_list.value;

        var ex = InstaBucket.load_exp_pref_tla( cur_tla );

        groups_add_exp_to_current( ex );
    }
    catch(e)
    {
        alert('on find use:\n' + e);
    }
}

function on_find_edit()
{
    try
    {
        var exp_list = document.getElementById( 'find-exp-list' );

        var cur_tla = exp_list.value;

        var ex = InstaBucket.load_exp_pref_tla( cur_tla );

        if( null == ex )
        {
            dump('on find edit failed to load tla: ' + cur_tla + '\n');
            return;
        }

        dump('send request to show experiment in edit tab: ' + ex.tla + '\n');

        edit_show_experiment( ex );
    }
    catch(e)
    {
        dump('**exception** on find edit:\n' + e + '\n');
    }
}

