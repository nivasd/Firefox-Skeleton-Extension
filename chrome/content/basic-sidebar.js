dump('basic sidebar js file begin\n');


function parse_html_text()
{
    try
    {
        update_progress('called html parse');

        var current_html = get_current_html();
        dump('html size: ' + current_html.length + '\n');
/*
    <div id="id_adINTERSTITIAL" style="margin: auto;" class="xp-b-clearfix xp-bx-widget" align="center">

    <!-- v.1n --><!-- 2.0.1.68 /html.cms/TPID=1&EAPID=00000&PLACEMENT=INTERSTITIAL&LOCATION=HOTELS&SUBLOCATION=RESULTS&SECURE=0&LANGID=1033&tile=82fc8f66-e848-445b-a92b-9c0f105d42da&IPGEO=819.BELLEVUE&ip=208.95.100.4&USERTYPE=SHOPPER&EMAIL=YES -->
    <img src="080603_telesales-hotels_300x250.gif">
    <comment type="id" value="144887"><!-- --></comment><!-- 2.0.1.68 end (3ms) -->

    </div>
*/
        // regex with \s\S will match white space and non white space
        // including line breaks.
        // .* does not match line breaks.
        var find_add_div_regex = /<div id="id_ad[\s\S]*?<\/div>/g;
        var max_try = 50;
        var text_index = 0;
        while( max_try-- > 0 )
        {
            var regex_match = find_add_div_regex.exec( current_html );
            if( null == regex_match || regex_match.length < 1 )
            {
                dump('found no matches');
                break;
            }

            var found_div = regex_match[0];
            show_parse_result( text_index, found_div );
            text_index++;
        }
    }
    catch(e)
    {
        dump('exception: parse_html_text:\n' + e + '\n');
    }
}


function parse_html_cms()
{
    try
    {
        update_progress('called html parse cms');

        var current_html = get_current_html();
        dump('html size: ' + current_html.length + '\n');
/*
<!-- v.1n --><!-- 2.0.1.68 /html.cms/TPID=1&EAPID=0000&PLACEMENT=INTERSTITIAL&LOCATION=HOTELS&SUBLOCATION=RESULTS&SECURE=0&LANGID=1033&tile=e56700b0-eb07-4f8c-a4a7-dca4f2610919&IPGEO=819.BELLEVUE&ip=208.95.100.4&USERTYPE=SHOPPER&EMAIL=YES -->
<img src="http://media.expedia.com/media/content/expus/graphics/launch/deals/080603_telesales-hotels_300x250.gif">
<comment type="id" value="144887" ><!-- --></comment><!-- 2.0.1.68 end (3ms) -->

</div>
*/
        // regex with \s\S will match white space and non white space
        // including line breaks.
        // .* does not match line breaks.
        var find_add_div_regex = /<!--[^<]*html.cms[\s\S]*<comment[\s\S]*?<\/div>/g;
        var max_try = 50;
        var text_index = 0;
        while( max_try-- > 0 )
        {
            var regex_match = find_add_div_regex.exec( current_html );
            if( null == regex_match || regex_match.length < 1 )
            {
                dump('found no matches');
                break;
            }

            var found_div = regex_match[0];
            show_parse_result( text_index, found_div );
            text_index++;

            // pull out the key value pairs
            // /TPID=1&EAPID=0000&PLACEMENT=INTERSTITIAL&LOCATION=HOTELS&SUBLOCATION=RESULTS&SECURE=0&LANGID=1033&tile=e56700b0-eb07-4f8c-a4a7-dca4f2610919&IPGEO=819.BELLEVUE&ip=208.95.100.4&USERTYPE=SHOPPER&EMAIL=YES -->

            // \S = non white space
            var find_cms_args = /[/&]([^=]+)=([^\s^&]+)/g;
            var max_args = 30;
            var key_value_pairs = '';
            while( max_args-- > 0 )
            {
                var regex_match = find_cms_args.exec( found_div );
                if( null == regex_match || regex_match.length < 3 )
                {
                    break;
                }
                key_value_pairs += regex_match[1] + ' => ' + regex_match[2] + '\n';
            }
            show_parse_result( text_index, key_value_pairs );
            text_index++;
        }
    }
    catch(e)
    {
        dump('exception: parse_html_text:\n' + e + '\n');
    }
}


function update_progress(text)
{
    try
    {
        dump(text + '\n');
        var edit = document.getElementById('debug-progress');
        edit.value = edit.value + "\n" + text;
    }
    catch(e)
    {
        dump('exception: update_progress:\n' + e + '\n');
    }
}

function show_parse_result( text_index, text)
{
    try
    {
        var edit = document.getElementById('parse-output-textbox-' + text_index);
        if( !edit )
        {
            dump('index too large in show parse result: ' + text_index + '\n');
            return;
        }
        edit.value = text;
    }
    catch(e)
    {
        dump('exception: show_parse_result:\n' + e + '\n');
    }
}

function basic_test()
{
    try
    {
        alert('basic_test was called in adds sidebar js');
        update_progress('called basic_test');
    }
    catch(e)
    {
        dump('exception: basic_test:\n' + e + '\n');
    }
}

/*
function printPage() {
    print(); 
}



function printIframe(id)
{
    var iframe = document.frames ? document.frames[id] : document.getElementById(id);
    var ifWin = iframe.contentWindow || iframe;
    iframe.focus();
    ifWin.printPage();
    return false;
}

*/

function get_current_html()
{
    var html = '';
    try
    {
        var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Components.interfaces.nsIWindowMediator)
                            .getMostRecentWindow("navigator:browser");
        var currBrowser = currentWindow.getBrowser();
        var contentDoc = currBrowser.contentDocument;
        update_progress("Nivas"); 
        //update_progress(frames[5].contentWindow.document.body.innerHTML); 
        //update_progress(window.frames[5].document.body.innerHTML); 
        //update_progress(currBrowser.frames[5].contentWindow.document.body.innerHTML); 
     
	//Get iframes 
        var iframes = currBrowser.contentDocument.getElementsByTagName("iframe");
        for (var i=0; i < iframes.length; i++) { 
               try {
	          var check_iframe = iframes[i].contentWindow.document.body.innerHTML; 
               } catch (e) {
		      update_progress("Error: "); 
                      update_progress(e);
                      update_progress(i);
                      continue;  	
               }  
               //iframe found and it can be accessed. 
               if (check_iframe) {
                  html=html + check_iframe;
		  update_progress(check_iframe); 							
	       }	
	       		
               update_progress(i);     

	}
        update_progress("Excellent!!!!"); 
        //update_progress(frames[5].contentDoc.body.innerHTML); 
        //alert(window.frames[5].document.body.innerHTML);  
        html = contentDoc.body.innerHTML + html;
    }
    catch(e)
    {
        html = 'exception, failed to get html:\n' + e;
    }
    return html;
}


dump('basic sidebar js file end\n');

