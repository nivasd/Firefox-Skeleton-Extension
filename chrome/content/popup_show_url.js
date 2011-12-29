/*

    user wants to see the URL for copy / pasting

    loading values from here:

        InstaBucket.Grouping0.name
        InstaBucket.Grouping0.tla0
        InstaBucket.Grouping0.tla1
        InstaBucket.Grouping0.tla2

    setting values here:

        InstaBucket.experiment0.tla

 */

const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
        getService(Components.interfaces.nsIClipboardHelper);
//        gClipboardHelper.copyString("Put me on the clipboard, please.");

prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService)
        .getBranch("InstaBucket.");
prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);

function on_show_url_window_load()
{
    if( !document )
    {
        dump('on show url has no document\n');
        return;
    }

    var url_to_display = '';
    var url_e3_to_display = '';
    if( 'arguments' in window && window.arguments.length  > 0 )
    {
        dump('found arguments in window\n');
        url_to_display = window.arguments[0].urlToDisplay;
        url_e3_to_display = window.arguments[0].urle3ToDisplay;
    }
    else
    {
        dump('found no arguments in window\n');
    }

    var url_edit = document.getElementById( 'show-url-textbox' );
    var url_e3_edit = document.getElementById( 'show-url-e3-textbox' );

    if( !url_edit )
    {
        dump('failed to get edit box for showing the url\n');
    }
    else
    {
        dump('on show url : success in setting url\n');
        url_edit.value = url_to_display;
    }

    if( !url_e3_edit )
    {
        dump('failed to get edit box for showing the e3 url\n');
    }
    else
    {
        dump('on show url : success in setting e3 url\n');
        url_e3_edit.value = url_e3_to_display;
    }

}

function on_pane_load()
{
    dump('called on pane load for popup show url\n');
}

function on_show_url_copy_to_clipboard()
{
    try
    {
        var url_edit = document.getElementById( 'show-url-textbox' );
        var item_for_clipboard = url_edit.value;

        dump('placing text on clipboard: ' + item_for_clipboard + '\n');
        gClipboardHelper.copyString(item_for_clipboard);
    }
    catch(e)
    {
        dump('**exception** on_show_url_copy_to_clipboard:\n' + e);
    }

    return true;
}

function on_show_url_e3_copy_to_clipboard()
{
    try
    {
        var url_edit = document.getElementById( 'show-url-e3-textbox' );
        var item_for_clipboard = url_edit.value;

        dump('placing text on clipboard: ' + item_for_clipboard + '\n');
        gClipboardHelper.copyString(item_for_clipboard);
    }
    catch(e)
    {
        dump('**exception** on_show_url_e3_copy_to_clipboard:\n' + e);
    }

    return true;
}

