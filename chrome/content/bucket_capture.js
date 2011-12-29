
/*

Bucket_capture

eventually this will deal with all things bucket data:

- capture
  - via omniture traffic
  - via html parsing
  - via https call to abacus
  - via javascript variable access
- store
  - based on pos and environment
  - start clean with each firefox restart
- publish
  - public apis
  - get current stuff ( use default pos and environment )
  - get current stuff ( caller passes in lookup stuff )


the v17 parameter is an omniture tag, which tells which page we are on
this lets us store the buckets at omniture traffic time
then when a tab change is done, we can retrieve them, based on html content

html appears to always have this: to help automation know the page.
<div style="display:none;">
    <input id="pageId" value="page.Hotels.Infosite.Information" type="hidden">
</div>

--->>> what about the different ways of getting stuff?
at the moment this will have a single hash globally
if experiment stuff is collect by html or omniture traffic
how will they be kept separate?

--->>> what about hotel, infosite, flights, etc.
each page has an ID, use that ID to separate stuff.
when the omniture tag is received, do we know what the html item is?
maybe one of the omniture items is the page name.

the omniture tag v17 has the page name:
v17 = page.Hotel-Search
v17 = page.Hotels.Infosite.Information

the html has this item:
<div style="display:none;">
    <input id="pageId" value="page.Hotels.Infosite.Information" type="hidden">
</div>


maybe apppend something to the hash?

Bucket_capture.Environments
  hash of experiment_struct

  key = pos_env
  key = pos_env_html
  key = pos_env_omniture
    i.e.  US_www.expedia.com.estr34.karmalab.net
  val = array of experiment_structs
    i.e.
    [
        [
            id: 1056,
            bucket: 1,
            description: 'some text'
        ],
        [
            id: 1111,
            bucket: 0,
            description: 'video content'
        ]
    ]

*/

/*
    to run tests:
    launch firefox with argument -console
    use Extension Developer, Javascript Environment
*/
var g_testing = false;
var g_full_trace = false;

var g_last_key;

var omniture_buckets = new Bucket_capture( 'omniture', 'o' );
var html_buckets = new Bucket_capture( 'html', 'h' );

function experiment_struct()
{
    this.id = -1;
    this.bucket = -1;
    this.description = '';
}

function experiment_struct_dump( obj )
{
    dump('\n\n  dump of experiment struct:\n\n');
    dump('    id    : ' + obj.id + '\n' );
    dump('    bucket: ' + obj.bucket + '\n' );
    dump('    descr : ' + obj.description + '\n' );
}

// bucket capture class,
// two instances: omniture and html

function Bucket_capture( obj_name, short )
{
    this.obj_name = obj_name;
    this.short = short;
    this.Environments = new Array();

    this.validate_key = function( key )
    {
        try
        {
            if( !key )
            {
//                 dump('no key, grab default: ');
                key = this.calculate_default_key();
//                 dump(key + '\n');
            }
        }
        catch(e)
        {
            dump('bucket capture:\n' + e + '\n' );
        }
        g_last_key = key;
        return key;
    }

    this.calculate_default_key = function()
    {
        var key = '';
        try
        {
            key = '';
            var pos = InstaBucket.get_pos();
            var env = InstaBucket.get_env();
            var page = InstaBucket.get_page_name();
            key = pos + '_' + env + '_' + page;
        }
        catch(e)
        {
            dump('calculate default key:\n' + e + '\n');
        }
        return key;
    }

    this.get = function( key )
    {
        var array_result = null;
        try
        {
            key = this.validate_key( key );
            array_result = this.Environments[ key ];

            if( !array_result )
            {
                dump('get found no array under key: ' + key + ', creating one\n');
                array_result = new Array();
                this.Environments[key] = array_result;
            }
        }
        catch(e)
        {
            dump('** exception: get(' + key + '):\n' + e + '\n');
        }
        return array_result;
    }

    this.get_experiment = function( exp_id, key )
    {
        var experiment = null;
        try
        {
            key = this.validate_key( key );
            if( g_full_trace ) dump('get_experiment, looking for id: ' + exp_id + ' within key: ' + key + '\n' );

            var experiments = this.get( key );
            if( g_full_trace )
            {
                dump(' get experiment : ' + experiments + '\n' );
                if( experiments )
                {
                    dump(' count: ' + experiments.length + '\n' );
                }
            }
            for( var ei in experiments )
            {
                var exps = experiments[ei];
                var id = exps.id;
                if( g_full_trace )
                {
                    dump('get_experiment found:\n');
                    experiment_struct_dump( exps );
                }
                if( id == exp_id )
                {
                    if( g_full_trace ) dump('found match\n');
                    experiment = exps;
                    break;
                }
            }
            if( !experiment )
            {
                dump(this.short + ' no experiment with id ' + id + ' found, creating one.\n' );
                experiment = new experiment_struct();
                experiment.id = exp_id;
                experiments.push( experiment );
            }
        }
        catch(e)
        {
            dump('** exception: get experiment:\n' + e + '\n' );
        }
        return experiment;
    }

    this.get_bucket = function( exp_id, key )
    {
        var bucket = -1;
        try
        {
            key = this.validate_key( key );
            var experiment = this.get_experiment( exp_id, key );
            bucket = experiment.bucket;
        }
        catch(e)
        {
            dump('** exception: get bucket:\n' + e + '\n' );
        }
        return bucket;
    }

    this.set = function( many_experiments, key )
    {
        var array_result = null;
        try
        {
            key = this.validate_key( key );
            this.Environments[ key ] = many_experiments;
        }
        catch(e)
        {
            dump('** exception: set(' + key + ')\n' + e + '\n');
        }
        return array_result;
    }

    this.set_bucket = function( id, bucket, key )
    {
        try
        {
            key = this.validate_key( key );
            var experiment = this.get_experiment( id, key );

//             dump(this.short + ' set bucket of id: ' + id + ' to: ' + bucket + ' in key: ' + g_last_key + '\n');
            experiment.bucket = bucket;

            this.make_first( id, key );
        }
        catch(e)
        {
            dump('** exception: set bucket values:\n' + e + '\n' );
        }
    }

    this.set_experiment_values = function( id, bucket, describe, key )
    {
        try
        {
            key = this.validate_key( key );
            var es = new experiment_struct();
            es.id = id;
            es.bucket = bucket;
            es.describe = describe;

            this.set_experiment( es, key );
        }
        catch(e)
        {
            dump('** exception: set experiment values:\n' + e + '\n' );
        }
    }

    this.set_experiment = function( one_experiment, key )
    {
        try
        {
            key = this.validate_key( key );
            var exp_matched = false; // change rather than add duplicates

            var experiments = this.get( key );
            if( !experiments )
            {
                experiments = new Array();
                this.set( experiments, key );
            }
            var count = experiments.length;
            for( var exp_index = 0 ; exp_index < count ; exp_index++ )
            {
                var expr = experiments[exp_index];
                if( expr.id == one_experiment.id )
                {
                    experiments = one_experiment;
                    exp_matched = true;
                    break;
                }
            }
            if( !exp_matched )
            {
                experiments.push( one_experiment );
            }

            this.make_first( one_experiment.id, key );

        }
        catch(e)
        {
            dump('** exception: get experiment:\n' + e + '\n' );
        }
    }

    // an experiment has changed
    // promote it to the head of the list
    // so that callers will get it first.
    this.make_first = function(id, key)
    {
        try
        {
            var exp_to_be_first = this.get_experiment( id, key );
            var experiments = this.get( key );
            var found = true;
            while( found )
            {
                found = false;
                var count = experiments.length;
                for( var i = 0 ; i < count ; i++ )
                {
                    var ex = experiments[i];
                    if( ex && ex.id == id )
                    {
                        found = true;
                        // remove the experiment, and duplicates
                        experiments.splice( i, 1 );
                        break;
                    }
                }
            }
            // now the experiment is first.
            experiments.unshift( exp_to_be_first );
        }
        catch(e)
        {
            dump('** exception: make first:\n' + e + '\n' );
        }
    }

    this.dump = function()
    {
        try
        {
            dump('\n\ndump of Bucket_capture:\n  ' + this.obj_name + '\n\n');

            for( var e in this.Environments )
            {
                dump('  environment hash lookup:\n');
                var e_val = this.Environments[e];
                dump( '  ' + e + ' = ' + e_val + '\n' );

                for( var b in e_val )
                {
                    var b_val = e_val[b];
                    dump( '   ' + b + ' = ' + b_val + '\n' );

                    for( var bitem in b_val )
                    {
                        var property = b_val[ bitem ];
                        dump( '    ' + bitem + ' : ' + property + '\n' );
                    }
                }
            }
        }
        catch(e)
        {
            dump('** exception: \ndump of bucket capture threw:\n' + e + '\n');
        }
    }
}







if( g_testing )
{
    var test_buckets = new Bucket_capture( 'ztestingz' );
    var fail_count = 0;

    dump('\n\n\nstarting testing of bucket capture zz\n\n\n');

    function test_get_set()
    {
        var abc_out = test_buckets.get('abcdefg');
        if( null != abc_out && abc_out.length > 0 )
        {
            fail_count ++;
            dump( 'fail: get env expected null, gave back:' + abc_out + '\n' );
        }

        var sample_exps =
             [
                {
                    id: 1056,
                    bucket: 4,
                    description: 'some text'
                },
                {
                    id: 1111,
                    bucket: 5,
                    description: 'video content'
                }
            ];
       var expr = {
           id: 9876,
           bucket: 77,
           description: 'just another test exp 9876 guy'
       };

       var key = 'abcde';
       var key2 = 'zzzaazzz';
       test_buckets.set( sample_exps, key );
       test_buckets.set_experiment( expr, key );

       test_buckets.dump();

       var get_abcde = test_buckets.get( key );

       dump( key + ' is: ' + get_abcde + '\n' );
       if( get_abcde )
       {
           dump('length of result: ' + get_abcde.length + '\n');
       }

       var exp_1056 = test_buckets.get_experiment( 1056, key );

       if( exp_1056.id != 1056 )
       {
           fail_count++;
           dump('fail: id should be 1056, came back as: ' + exp_1056.id + '\n');
       }

       if( exp_1056.bucket != 4 )
       {
           fail_count++;
           dump('fail: bucket should be 4, came back as: ' + exp_1056.bucket + '\n' );
       }

       var new_bucket_value = 3;
       test_buckets.set_bucket( 1056, new_bucket_value, key );
       test_buckets.set_bucket( 1056, new_bucket_value + 1, key2 );

       var exp_1056_bucket = test_buckets.get_bucket( 1056, key );
       var exp_1056_bucket2 = test_buckets.get_bucket( 1056, key2 );

       if( exp_1056_bucket != new_bucket_value )
       {
           fail_count++;
           dump('fail: bucket 1056 = ' + exp_1056_bucket + ', expected: ' + new_bucket_value + '\n' );
       }

       if( exp_1056_bucket2 != new_bucket_value + 1 )
       {
           fail_count++;
           dump('fail: bucket 1056 = ' + exp_1056_bucket2 + ', expected: ' + new_bucket_value+1 + '\n' );
       }

    }

    test_get_set();

    dump('failure count = ' + fail_count + '\n' );

       test_buckets.dump();
}

