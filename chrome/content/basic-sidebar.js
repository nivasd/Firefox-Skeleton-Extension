dump('basic sidebar js file begin\n');

//Global Variables
var global_div_source=[]; 
var global_target_param=[]; 


function parse_html_text()
{
    try
    {
        //Create textbox to add all information
        const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        var textbox_item = document.createElementNS(XUL_NS, "textbox"); // create a new XUL label
        textbox_item.setAttribute('height', '200');
        textbox_item.setAttribute('id', 'results');
        textbox_item.setAttribute('multiline', 'true');
        //item.setAttribute("label", aLabel);
        document.getElementById('ad-panel-box').appendChild(textbox_item); 


        update_progress('called html parse');
        //Get source of page
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
            //store div; 
            global_div_source[text_index]= found_div; 
            //Store parameters
            var array = parse_html_cms(global_div_source[text_index]);
            global_target_param[text_index]=array; 
            create_adbox(text_index, found_div);  
            //show_parse_result( text_index, found_div );
            text_index++;
        }
        //Create Statistics for Ad Placements
        //var ad_statistics = document.getElementById('ad_statistics'); 
        //ad_statistics.value = "Ad Statistics"; 
        var adstat_item = document.createElementNS(XUL_NS, "label"); // create a new XUL label
  //var item = document.createElement("label"); // create a new XUL label
        adstat_item.setAttribute('value', 'Total No. of Ads: ' + global_div_source.length);
        document.getElementById('helper').appendChild(adstat_item); 
        var total_placements = 'Ad Placements: ';  
        for (var i=0; i<global_target_param.length; i++) {
             total_placements+=global_target_param[i]['PLACEMENT']+' ';  
        }
        var adstat_placements = document.createElementNS(XUL_NS, "textbox"); // create a new XUL label
        adstat_placements.setAttribute('value', total_placements);
        document.getElementById('helper').appendChild(adstat_placements); 
         
        
         
    }
    catch(e)
    {
        dump('exception: parse_html_text:\n' + e + '\n');
    }
}





function parse_html_cms(cms_text)
{
    try
    {
        update_progress('called html parse cms');

        //var current_html = get_current_html();
        var current_html = cms_text;
        //alert(current_html);  
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
        var find_add_div_regex = /html.cms\/([\s\S]*)\s-->/;
        //var max_try = 50;
        //var text_index = 0;
        //while( max_try-- > 0 )
        //{
            var regex_match = find_add_div_regex.exec( current_html );
            //if( null == regex_match || regex_match.length < 1 )
            //{
                //dump('found no matches');
                //break;
            //}

            var found_div = regex_match[1];
            var found_div_result = found_div.split('\s'); 
            found_div = found_div_result[0];  
            update_progress("Found div: " + found_div);  
            //show_parse_result( text_index, found_div );
            //text_index++;

            // pull out the key value pairs
            // /TPID=1&EAPID=0000&PLACEMENT=INTERSTITIAL&LOCATION=HOTELS&SUBLOCATION=RESULTS&SECURE=0&LANGID=1033&tile=e56700b0-eb07-4f8c-a4a7-dca4f2610919&IPGEO=819.BELLEVUE&ip=208.95.100.4&USERTYPE=SHOPPER&EMAIL=YES -->

            // \S = non white space
            var find_cms_args = /[/&]([^=]+)=([^\s^&]+)/g;
            var max_args = 30;
            var key_value_pairs = '';
            var params_array=[]; 
            while( max_args-- > 0 )
            {
                var regex_match = find_cms_args.exec( found_div );
                if( null == regex_match || regex_match.length < 3 )
                {
                    break;
                }
                update_progress('Regix 1: ' + regex_match[1]); 
                update_progress('Regix 2: ' + regex_match[2]); 
                params_array[regex_match[1]] = regex_match[2]; 
                key_value_pairs += regex_match[1] + ' => ' + regex_match[2] + '\n';
            }
            //reset params_array
            //show_parse_result( text_index, key_value_pairs );
            //text_index++;
        //}
           update_progress(key_value_pairs); 
        return params_array; 
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


function createAdLabel(text_index) {
  const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
  var item = document.createElementNS(XUL_NS, "label"); // create a new XUL label
  //var item = document.createElement("label"); // create a new XUL label
  item.setAttribute('id', 'ads-box-' + text_index);
  if (global_target_param[text_index]['PLACEMENT']) {
	var placement = global_target_param[text_index]['PLACEMENT'];
   
  } else {
       var placement = 'Placement not found'; 
  } 
  item.setAttribute('value', 'Ad Placement: ' + placement);
  //item.setAttribute("label", aLabel);
  return item;
}


function getTargetingParam(text_index) {
  update_progress('get Targeting Param'); 
  try {
        var edit = document.getElementById('results');
        if( !edit )
        {
            dump('index too large in show parse result: ' + text_index + '\n');
            return;
        }
        //parse html.cms
        var array = parse_html_cms(global_div_source[text_index]);
        var print_array='' 
        for (var i in array) {
	     print_array += i + '=>' + array[i]+ '\n'; 	
        }
 
        edit.value = print_array;
        setAdTitle(text_index); 

     
  //const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
  //var hbox_item = document.createElementNS(XUL_NS, "hbox"); // create a new XUL label
  //var item = document.createElementNS(XUL_NS, "textbox"); // create a new XUL label
  //var item = document.createElement("label"); // create a new XUL label
  //item.setAttribute('id', 'ads-textbox-' + text_index);
  //item.setAttribute('width', '200');
  //hbox_item.appendChild(item);  
  //item.setAttribute("label", aLabel);
  //return item;
  //elem = document.getElementById('adds_helper_Sidebar'); 
  //elem.appendChild(hbox_item); 
  } catch (e) {
     update_progress('getAdSource Error: ' + e); 
  
  } 


}

function setAdTitle(text_index) {
   try {
       if (global_target_param[text_index]['PLACEMENT']) {
	 var placement = global_target_param[text_index]['PLACEMENT'];
   
       } else {
         var placement = 'Placement not found'; 
       } 

       document.getElementById('ad_listings').value = 'Ad Placement: ' + placement;  


   } catch (e) {
        update_progress("setAdTitle Error: " + e); 

   }

}


function getAdSource(text_index) {
  update_progress('get Ad Source'); 
  try {
        var edit = document.getElementById('results');
        if( !edit )
        {
            dump('index too large in show parse result: ' + text_index + '\n');
            return;
        }
        edit.value = global_div_source[text_index];
        setAdTitle(text_index); 

     
  //const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
  //var hbox_item = document.createElementNS(XUL_NS, "hbox"); // create a new XUL label
  //var item = document.createElementNS(XUL_NS, "textbox"); // create a new XUL label
  //var item = document.createElement("label"); // create a new XUL label
  //item.setAttribute('id', 'ads-textbox-' + text_index);
  //item.setAttribute('width', '200');
  //hbox_item.appendChild(item);  
  //item.setAttribute("label", aLabel);
  //return item;
  //elem = document.getElementById('adds_helper_Sidebar'); 
  //elem.appendChild(hbox_item); 
  } catch (e) {
     update_progress('getAdSource Error: ' + e); 
  
  } 


}

//create buttons

function create_buttons(text_index) {
  try {
  var elem = document.getElementById('ad-panel-box');
  const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

  var i = 0; 
  for (i=0; i<5; i++){  
    var item = document.createElementNS(XUL_NS, "button"); // create a new XUL label
    //var item = document.createElement("label"); // create a new XUL label
    switch (i) {
	case 0: 
                item.setAttribute('id', 'ads-button-' + text_index + '-highlight');
                item.setAttribute('label', 'Highlight Ad'); 
                break; 
         
        case 1: 
                item.setAttribute('id', 'ads-button-' + text_index + '-order');
                item.setAttribute('label', 'Order Information'); 
                break; 

        case 2: 
                item.setAttribute('id', 'ads-button-' + text_index + '-adsource');
                item.setAttribute('label', 'Ad Source'); 
                item.setAttribute('oncommand', 'getAdSource(' + text_index + ')'); 
                break; 

        case 3: 
                item.setAttribute('id', 'ads-button-' + text_index + '-targetting');
                item.setAttribute('oncommand', 'getTargetingParam(' + text_index + ')'); 
                item.setAttribute('label', 'Targeting Parameters'); 
                break;
        case 4: 
                item.setAttribute('id', 'ads-button-' + text_index + '-advanced');
                item.setAttribute('label', 'Advanced'); 
                break;
	default: 
                item.setAttribute('id', 'ads-button-error');
                item.setAttribute('label', 'Blank'); 

    }
    //Set flex to 1
    item.setAttribute('flex', '1'); 
    item.setAttribute('width', '120'); 
    //If not divisble by 2 add to new hbox. 
    if ((i%2)==0) {
         var hbox_button = document.createElementNS(XUL_NS, "hbox"); 
         update_progress('Digit: ' + 'ads-hbox-' + text_index + '-' + i );  
         hbox_button.setAttribute('id', 'ads-hbox-' + text_index + '-' + i);
         hbox_button.appendChild(item); 
         elem.appendChild(hbox_button);
         
    } else {
        update_progress('Digit Else: ' + 'ads-hbox-' + text_index + '-' + (i-1));  
        var hbox_button = document.getElementById('ads-hbox-' + text_index + '-' + (i-1));
        hbox_button.appendChild(item);  
    }


    //elem.appendChild(item);
    
    
       
    //item.setAttribute('value', 'Ad Button: ' + text_index + placement);
    //item.setAttribute("label", aLabel);
  }
  
  //return item;
  } catch (e) {
      update_progress('createButtons: ' + e); 
        

  }
}




/*
var popup = document.getElementById("myPopup"); // a <menupopup> element
var first = createMenuItem("First item");
var last = createMenuItem("Last item");
popup.insertBefore(first, popup.firstChild);
popup.appendChild(last);
*/

function create_adbox(text_index, found_div) {
   //Get key value pairs
   //Get placement
   //Get source of page   
   //Add menulist
   //Add 4 buttons   

  
   try {
      var nodeLabel = createAdLabel(text_index);
      //node.setAttribute(id, 'ads-box-' + text_index);
      //node.setAttribute(value, 'Ad Placement: ads-box-' + text_index);
    } catch(e) {
      update_progress('Failed 1st part: ' + e); 
    }
    try {
      //if (text_index!='0') { 
      //  alert("Not 0: " + text_index); 
      //   curr_elem_id = text_index-1; 
      //   alert("Curr Elem ID: " + curr_elem_id); 
      //   var elem = document.getElementById('ads-box-' + curr_elem_id);
      //} else {
         //alert("Gett " + text_index); 
        var elem = document.getElementById('ad-panel-box');
	elem.style.overflowY="auto";  	
      //}
      elem.appendChild(nodeLabel);
      create_buttons(text_index); 
    } catch(e) {
      update_progress('Error: ' + e); 
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

