
// alert('pref omniture js');

// populate the list of groupings

// seems to not be used.

// todo: write intent of file.

function init_omniture_pane()
{
    try
    {
        dump('init omniture pane\n');

        omniture_populate_urls();

        var url_dropdown = document.getElementById('omniture-url-dropdown');
        var exp_list = document.getElementById('omniture-list');
        var url_list = bucket_hash.get_urls();

        var url_item = url_list[0];
        // if we pull the value directly, nothing there.
//         var url_latest = active_page_abacus.latest_url;

        // must load it from a preference / saved value
        var url_latest = InstaBucket.get_current_url();

        dump( 'url item: ' + url_item + ' latest url = ' + url_latest + '\n' );

        var om_tags = active_page_abacus.get_omniture_hash( url_latest );

        dump( 'omniture hash = ' + om_tags + '\n' );

        om_tags['manually'] = 'added value';

        for( var nm in om_tags )
        {
            var vl = om_tags[ nm ];

            var row = document.createElement('listitem');
            row.setAttribute('value', vl);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', vl);
            row.appendChild(cell);

            var cell = document.createElement('listcell');
            cell.setAttribute('label', nm);
            row.appendChild(cell);

            var appended = exp_list.appendChild(row);

        }

    }
    catch(e)
    {
        dump('init omniture pane:\n' + e);
    }
}

function omniture_populate_urls()
{
    try
    {
        var url_dropdown = document.getElementById('omniture-url-dropdown');
        var url_list = bucket_hash.get_urls();

        url_dropdown.removeAllItems();

        for( var i = 0 ; i < url_list.length ; i ++)
        {
            url_dropdown.append( url_list[i], url_list[i] );
        }
    }
    catch(e)
    {
        dump('omniture populate urls:\n' + e + '\n' );
    }
}


