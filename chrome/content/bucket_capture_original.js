
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


--->>> what about the different ways of getting stuff?
at the moment this will have a single hash globally
if experiment stuff is collect by html or omniture traffic
how will they be kept separate?

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

var g_testing = true;

function experiment_struct()
{
    this.id = -1;
    this.bucket = -1;
    this.description = '';
}

// bucket capture class,
// two instances: omniture and html

function Bucket_capture =
{
    Environments : new Array(),

    get : function( key )
    {
        var array_result = null;
        try
        {
            if( !key )
            {
                key = '';
                var pos = InstaBucket.get_pos();
                var env = ExpWebReader.url_environment();
                key = pos + '_' + env;
            }
            array_result = this.Environments[ key ];
        }
        catch(e)
        {
            dump('get(' + key + '):\n' + e + '\n');
        }
        return array_result;
    },

    get_experiment : function( exp_id, key )
    {
        var experiment = null;
        try
        {
            var experiments = this.get( key );
            for( var exps in experiments )
            {
                var id = exps.id;
                if( id == exp_id )
                {
                    experiment = b.bucket;
                    break;
                }
            }
        }
        catch(e)
        {
            dump('get experiment:\n' + e + '\n' );
        }
        return experiment;
    },

    get_bucket : function( exp_id, key )
    {
        var bucket = -1;
        try
        {
            var experiment = this.get_experiments( exp_id, key );
            bucket = experiment.bucket;
        }
        catch(e)
        {
            dump('get bucket:\n' + e + '\n' );
        }
        return bucket;
    },

    set : function( many_experiments, key )
    {
        var array_result = null;
        try
        {
            this.Environments[ key ] = many_experiments;
        }
        catch(e)
        {
            dump('set(' + key + ')\n' + e + '\n');
        }
        return array_result;
    },

    set_experiment_values : function( id, bucket, describe, key )
    {
        try
        {
            var es = new experiment_struct();
            es.id = id;
            es.bucket = bucket;
            es.describe = describe;

            this.set_experiment( es );
        }
        catch(e)
        {
            dump('set experiment values:\n' + e + '\n' );
        }
    },

    set_experiment : function( one_experiment, key )
    {
        try
        {
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
        }
        catch(e)
        {
            dump('get experiment:\n' + e + '\n' );
        }
    },

    dump: function()
    {
        try
        {
            dump('\n\ndump of Bucket_capture:\n\n');
            for( var e in Bucket_capture.Environments )
            {
                dump('  environment hash lookup:\n');
                var e_val = Bucket_capture.Environments[e];
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
            dump('\ndump of bucket capture threw:\n' + e + '\n');
        }
    }
}







if( g_testing )
{
    var fail_count = 0;

    dump('starting testing of bucket capture\n');

    function test_get_set()
    {
        var abc_out = Bucket_capture.get('abcdefg');
        if( null != abc_out )
        {
            fail_count ++;
            dump( 'get env expected null, gave back:' + abc_out + '\n' );
        }

        var sample_exp =
             [
                {
                    id: 1056,
                    bucket: 1,
                    description: 'some text'
                },
                {
                    id: 1111,
                    bucket: 0,
                    description: 'video content'
                }
            ];
       Bucket_capture.set(sample_exp, 'abcde');

       Bucket_capture.dump();

       Bucket_capture.
       var get_abcde = Bucket_capture.get('abcde');

       dump('abcde is: ' + get_abcde + '\n' );
       if( get_abcde )
       {
           dump('length of result: ' + get_abcde.length + '\n');
       }

    }


    var tgs = test_get_set();
}

