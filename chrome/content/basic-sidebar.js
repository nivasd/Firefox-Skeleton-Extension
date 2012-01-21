dump('basic sidebar js file begin\n');

//Global Variables
var global_div_source=[]; 
var global_adid=[];  
var global_target_param=[]; 
var global_div_id=[];
var global_iframe_window=[];             
var global_html_cms=[]; 


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
        document.getElementById('ad-info-box').appendChild(textbox_item); 


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
        //var find_add_div_regex = /<div id="id_ad[\s\S]*?<\/div>/g;
        var find_add_div_regex = /<div id="(id_ad|da_DCOL)[\s\S]*?<\/comment>/g;
        var max_try = 50;
        var text_index = 0;
        var double_interstitial = -1; 
        var html_cms_without_div = 0;
        while( max_try-- > 0 )
        {
            var regex_match = find_add_div_regex.exec( current_html );
            if( null == regex_match || regex_match.length < 1 )
            {
                //if (max_try!=49) {
                    //var find_add_html_cms_regex = /html.cms[\s\S]*?<\/comment>/g;
                    //var regex_match_html_cms = find_add_html_cms_regex.exec (current_html); 
                    		    

 
                 //   break; 
                //}  else {

//                 alert('found no div matches');

                 find_add_div_regex = /html.cms[\s\S]*?<\/comment>/g;
                 var regex_match = find_add_div_regex.exec( current_html );
                
                 //alert(regex_match); 
                 if( null == regex_match || regex_match.length < 1 ) {
                        //alert("Enter bad loop");  
			break; 
                 } 
                 html_cms_without_div = 1;
                //} 
	    }

                    

            var found_div = regex_match[0];
            //alert("Found Div: " + found_div); 
            //Store adid - comment 
            //var comment_regex = /comment type="id" value="(\d+)"/;
            var comment_regex = /comment type.*value="(\d+)"/;
            try {
              var comment_match = comment_regex.exec(found_div);  
              global_adid[text_index] = comment_match[1];  
            } catch (e) {
                global_adid[text_index] = "No comment id found for this ad placement. ";   
            }
            //store div; 
            global_div_source[text_index]= found_div; 
            //Store Div Id
            if (html_cms_without_div!=1) {
        	//This contains the div id so we can use the highlight function 
              
 		if (/da_DCOL/.exec(found_div)) {

                   div_id_regex = /(da_DCOL.*)\"[\s+]class/;
                } else {

                   div_id_regex = /(id_ad.*)\"[\s+]style/;
                }
               //div_id_regex = /((id_ad|da_DCOL).*)\"[\s+]style/;
               var regex_match_div = div_id_regex.exec(found_div);
               //alert(regex_match_div[1]);  
               global_div_id[text_index]=regex_match_div[1];             
            } else {
               global_div_id[text_index]="no_div_found"; 
            }
            //Store parameters
            var array = parse_html_cms(global_div_source[text_index], text_index);

            var set = 0;  
	    try {
              //special case for double interstials. 
              for (var i=0; i<global_target_param.length; i++) {
                   if (global_target_param[i]['PLACEMENT']==array['PLACEMENT']) {
                   	set = 1;     
	           } 
              }
            } catch(e) {
               alert('Failed check for interstitial: ' + e); 
            } 
             //Create adbox only if double interstitial does not exist. 
             if (set) {
                      continue;  
	     } 
             global_target_param[text_index]=array; 
             create_adbox(text_index, found_div); 
            //show_parse_result( text_index, found_div );
            text_index++;
            
        }
        //Create Statistics for Ad Placements
        var adtags = third_party_tags(current_html);
        sum_of_ads = global_target_param.length; 
        var adstat_item = document.createElementNS(XUL_NS, "label"); // create a new XUL label
  //var item = document.createElement("label"); // create a new XUL label
        adstat_item.setAttribute('value', 'Total Number of Ads: ' + sum_of_ads);
        document.getElementById('helper').appendChild(adstat_item); 
        var total_placements = 'Ad Placements: ';  
        for (var i=0; i<global_target_param.length; i++) {
		total_placements+=global_target_param[i]['PLACEMENT']+' ';
        }
        var adstat_placements = document.createElementNS(XUL_NS, "textbox"); // create a new XUL label
        adstat_placements.setAttribute('value', total_placements);
        document.getElementById('helper').appendChild(adstat_placements); 
        var adtags_item = document.createElementNS(XUL_NS, "label"); // create a new XUL label
  //var item = document.createElement("label"); // create a new XUL label
        adtags_item.setAttribute('value', 'Third Party Tags: ' + adtags);
        document.getElementById('helper').appendChild(adtags_item); 
         
        
         
    }
    catch(e)
    {
        alert('exception: parse_html_text:\n' + e + '\n');
    }
}


function third_party_tags(current_html) {
   try {
     var tags=''; 
     regex_bluekai = /bluekai/;
     regex_intentmedia = /intentmedia/; 
     regex_quantserve = /quantserve/;  
 
     if (regex_bluekai.exec(current_html)) {
         tags='BlueKai' 
     } 
     if (regex_intentmedia.exec(current_html)) {
         tags+=' - ' + 'Intent Media'; 

     }
     if (regex_quantserve.exec(current_html)) {
         tags+=' - ' + 'Quantcast/QuantServe'; 

     }
     if (tags=='') {
        tags = 'None found'; 
     }

     return tags; 



   } catch(e) {
       alert ('Error: ' + e); 
   }

}


function parse_html_cms(cms_text, text_index)
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

            //Get TPID Value - Special matching case
            var find_cms_tpid = /(TPID)=([^\s^&]+)/;
            var regex_cms_tpid = find_cms_tpid.exec(found_div); 
            params_array[regex_cms_tpid[1]] = regex_cms_tpid[2]; 
            key_value_pairs += regex_cms_tpid[1] + '=' + regex_cms_tpid[2] + '&';
             

	    //Get rest of the matching expressions 
            while( max_args-- > 0 )
            {
                var regex_match = find_cms_args.exec( found_div );
                //if( null == regex_match || regex_match.length < 3 )
                if( null == regex_match)
                {
                    break;
                }
                update_progress('Regix 1: ' + regex_match[1]); 
                update_progress('Regix 2: ' + regex_match[2]); 
                params_array[regex_match[1]] = regex_match[2]; 
                //key_value_pairs += regex_match[1] + ' => ' + regex_match[2] + '\n';
                key_value_pairs += regex_match[1] + '=' + regex_match[2] + '&';
            }
            global_html_cms[text_index]=key_value_pairs; 
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
       var placement = 'Placement is undefined.'; 
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
        var array = parse_html_cms(global_div_source[text_index], text_index);
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


function highlightAd(text_index) {
   update_progress('function highlight Ad'); 
   try {
       var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Components.interfaces.nsIWindowMediator)
                            .getMostRecentWindow("navigator:browser");
       var currBrowser = currentWindow.getBrowser();
       var contentDoc = currBrowser.contentDocument;
       //alert(global_div_id[text_index]);
        
       element = contentDoc.getElementById(global_div_id[text_index]);
       if (element==null) {
         //alert("Entering null loop"); 
	for (var i =0; i<global_iframe_window.length; i++) {
		element = global_iframe_window[i].document.getElementById(global_div_id[text_index]); 
                if (element!=null){
			//alert("Element found!"); 
                        break; 
 		}
                //alert(global_iframe_window[i].document.body.innerHTML);
        }

       }       

       var highlight_not_found = document.getElementById('results');
       if (element!=null) {
         //element.style.backgroundColor = "#FDFF47";
         element.style.border = "5px solid red";
         highlight_not_found.value = 'Placement highlighted. \n\nNote: If you are unable to find the highlighted placement, it is currently not available (Ex. INTERSTITIAL) or it is a hidden element on the webpage.';
         } else {
          highlight_not_found.value = 'Unable to highlight this ad placement.';
	}
        setAdTitle(text_index); 
        

   } catch (e) {
     update_progress('Highlight Ad Error: ' + e); 
   } 

}



function getAdvanced(text_index) {
  try {
      var win = Components.classes['@mozilla.org/appshell/window-mediator;1']
                  .getService(Components.interfaces.nsIWindowMediator)
                  .getMostRecentWindow('navigator:browser');
     
      //Get current URL 
      var currBrowser = win.getBrowser(); 
      var currURL = currBrowser.currentURI.spec; 
     
   
      //var url_split = currURL.split('\/'); 
 
      match_ads01 = /ads01.sb.karmalab.net/; 
      match_lab = /(sb|bgb).karmalab.net/;
      match_ppe = /expediaweb/; 
      var server='';
      if (match_ads01.exec(currURL)) {
         server = 'http://cheldfenac02.karmalab.net/html.cms/'     
      } else if (match_lab.exec(currURL)) {
         server = 'http://adsvip.ads01.sb.karmalab.net/html.cms/'     
      } else if (match_ppe.exec(currURL)) {
         server = 'http://ads.expedia.com/html.cms/'     
      } else {
         server = 'http://ads.expedia.com/html.cms/'     

      } 
 
      //var server = url_split[2];     
      //alert("Server: " + server); 
      win.gBrowser.selectedTab = win.gBrowser.addTab(server + global_html_cms[text_index] + 'params.styles=trace');



       setAdTitle(text_index); 
  } catch(e) {
	update_progress('GetAdvanced Error: ' + e); 


  }


}


function loadXMLDoc(adid)
{  

   try { 

      var win = Components.classes['@mozilla.org/appshell/window-mediator;1']
                  .getService(Components.interfaces.nsIWindowMediator)
                  .getMostRecentWindow('navigator:browser');
     
      //Get current URL 
      var currBrowser = win.getBrowser(); 
      var currURL = currBrowser.currentURI.spec; 
     
   
      //var url_split = currURL.split('\/'); 
 
      match_ads01 = /ads01.sb.karmalab.net/; 
      match_lab = /sb.karmalab.net/;
      match_ppe = /expediaweb/; 
      var server='';
      if (match_ads01.exec(currURL)) {
         server = 'http://cheldfemgr01:7001/Servlets/DCLKObjectLocator'     
      } else if (match_lab.exec(currURL)) {
         server = 'http://chelmgrads001:7001/Servlets/DCLKObjectLocator'     
      } else if (match_ppe.exec(currURL)) {
         server = 'http://admanager.idx.expedmz.com:7001/Servlets/DCLKObjectLocator'     
      } else {
         server = 'http://admanager.idx.expedmz.com:7001/Servlets/DCLKObjectLocator'     

      } 

   var xmlhttp;
   var html_text; 
   var edit = document.getElementById('results');
   xmlhttp=new XMLHttpRequest();
   xmlhttp.onreadystatechange=function()
   {
      if (xmlhttp.readyState==4 && xmlhttp.status==200)
      {
         html_text = xmlhttp.responseText; 

    //Get AdID
    var adid_regex = /Ad ID\<\/TD\>\<TD\>(\d+)\<\/B\>/;
    var adid_match = adid_regex.exec(html_text); 
    //Get FlightID
    var flightid_regex = /Flight ID<\/TD><TD>(\d+)<\/B>/;
    var flightid_match = flightid_regex.exec(html_text); 
    //Get Flight Number
    var flightnumber_regex = /Flight Number<\/TD><TD>(\d+)<\/B>/;
    var flightnumber_match = flightnumber_regex.exec(html_text); 
    //Get Order Id
    var orderid_regex = /Order ID<\/TD><TD>(\d+)<\/B>/;
    var orderid_match = orderid_regex.exec(html_text); 

    edit.value = 'Ad ID: ' + adid_match[1] + '\n' + 'Flight ID: ' + flightid_match[1] + '\n' + 'Flight Number: '  + flightnumber_match[1]+ '\n' + 'Order ID: ' + orderid_match[1];


      }
   }
   xmlhttp.open("POST",server,true);
   xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");
   xmlhttp.send('idType=ad&id=' + adid + '&SUBMIT=Submit');
   

    } catch(e) {
	alert('loadXMLDOC: ' + e); 		

    } 


}


function changeResultsBox(message) {
    var edit = document.getElementById('results');
    edit.value = message;

}


function getOrders(text_index) {
     try {
       loadXMLDoc(global_adid[text_index]); 
        setAdTitle(text_index); 

     } catch(e) {
        changeResultsBox("Error: " + global_adid[text_index]); 
//	update_progress('Error GetOrders: ' + e); 	
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
                item.setAttribute('oncommand', 'highlightAd(' + text_index + ')'); 
                break; 
         
        case 1: 
                item.setAttribute('id', 'ads-button-' + text_index + '-order');
                item.setAttribute('label', 'Order Information'); 
		item.setAttribute('oncommand', 'getOrders(' + text_index + ')'); 
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
                item.setAttribute('oncommand', 'getAdvanced(' + text_index + ')'); 
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
                  global_iframe_window[i]=iframes[i].contentWindow; 
                  html=html + check_iframe;
		  //alert(check_iframe); 							
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

function clearBoxes(elementid) {
  var container = document.getElementById(elementid); 
  
 // for (i=0; i<container.childNodes.length; i++) {
  //      if (container.childNodes[i].id=='ad_statistics') {
   //           continue; 
    //    } else {
     //       container.removeChild(container.childNodes[i]);  
      //  }

  //}
  //
  for(i=container.childNodes.length; i > 0; i--) {
        container.removeChild(container.childNodes[0]);
  }
  

  document.getElementById('ad-panel-box-top').innerHTML=""; 
  document.getElementById('ad-info-box').innerHTML=""; 
  document.getElementById('ad-panel-box').innerHTML=""; 
      


}


//Ads Load on new page


var win1 = Components.classes['@mozilla.org/appshell/window-mediator;1']
                  .getService(Components.interfaces.nsIWindowMediator)
                  .getMostRecentWindow('navigator:browser');
     
//win.gBrowser.addEventListener("DOMContentLoaded",function () {  

 //      toggleSidebar("viewSidebarMenu");
  //     parse_html_text(); }, true);

var pastTime = new Date(); 

var myExtension = {  
    init: function() {  
        // The event can be DOMContentLoaded, pageshow, pagehide, load or unload.  
        //if(win.gBrowser) win.gBrowser.addEventListener("DOMContentLoaded", this.onPageLoad, false);  
        if(win1.gBrowser) win1.gBrowser.addEventListener("pageshow", this.onPageLoad, false);  
    },  
    onPageLoad: function(aEvent) {
      if (document.getElementById('autoads').checked==true) {
       
        var currURL = win1.gBrowser.currentURI.spec; 
        var doc = aEvent.originalTarget; // doc is document that triggered the event  
        var win = doc.defaultView; // win is the window for the doc  
        // test desired conditions and do something  
        //if (doc.nodeName == "#document") return; // only documents  
        //if (win != win.top) return; //only top window.  
        if (win.frameElement) return; // skip iframes/frames  
        //alert("page is loaded \n" +doc.location.href); 
        var regex_expedia = /expedia/; 
        var currentTime = new Date();  
        if (regex_expedia.exec(doc.location.href) && currURL!=doc.location.href && (currentTime-pastTime>1000)){
             clearBoxes('helper');  
             clearBoxes('ad-panel-box');  
             clearBoxes('ad-info-box');  
             document.getElementById('ad_listings').value = 'Ad Placement Information';  
             global_div_source=[]; 
             global_adid=[];  
             global_target_param=[]; 
             global_div_id=[];
             global_iframe_window=[];             
             global_html_cms=[]; 
             parse_html_text(); 
             pastTime=currentTime;
             //currUrl=doc.location.href;  
        } 
    
      }     
    }  
}  


window.addEventListener("load", function load(event){  
      window.removeEventListener("load", load, false); //remove listener, no longer needed  
      myExtension.init();    
   },false); 



dump('basic sidebar js file end\n');

