'use strict';

const express = require("express");
const http = require('http');
const AWS = require('aws-sdk');
const geocoder = require('geocoder');
const socketio = require('socket.io');
const bodyParser = require('body-parser');
var crypto = require('crypto');
var Elasticsearch = require('aws-es');
var elasticsearch = new Elasticsearch({
	accessKeyId: '*******************',
	secretAccessKey: '********************',
	service: 'es',
	region: 'us-east-1',
	host: 'search-test-klibcn4gpc6pjsc2mq3lcpf7xu.us-east-1.es.amazonaws.com'
});
AWS.config.update({
    credentials: new AWS.Credentials('AKIAIX4KTXHWHH5FKLSQ', 'Q1/HEif+gTqozEaBjbmVfoDeEMuVmkDOt1SREisJ'),
    region: 'us-east-1'
});
let options = {
	hosts: ['search-test-klibcn4gpc6pjsc2mq3lcpf7xu.us-east-1.es.amazonaws.com'], // array of amazon es hosts (required)
	connectionClass: require('http-aws-es'), // use this connector (required)
};
let es = require('elasticsearch').Client(options);

class Config{
	constructor(app){
		app.set('view engine', 'html');
		app.engine('html', require('ejs').renderFile);
		app.set('views', (__dirname + '/views'));
		app.use(require('express').static(require('path').join('public_data')));
	}
}

class Routes{
	constructor(app,socket){
		this.app = app;
		this.io = socket;
		this.users = []; 
		this.paths = []; 
	}
	appRoutes(){
		this.app.get('/', (request,response) => {
			response.render('index');
		});
		this.app.get('/users', (request,response) => {
        });
	}
	socketEvents(){
		this.io.on('connection', (socket) => { 
			socket.on('username', (user) => {
		      	this.users.push({
		      		id : socket.id,
		      		userName : user['name']
		      	});

		      	var str; 
		      	elasticsearch.search({
					index: 'chathistory',
					type: 'doc',
					body: {
						query: {
							"match": { "name": user['name'] }
						}
					}
				}, function(err, data) {
					socket.emit('userloaded', user['name'], data); 
        		});
	        	
        		elasticsearch.search({
					index: 'userpoolfinal',
					type: 'doc',
					body: {
						query: {
							"match": { "userNamePass": user['name'] + user['password'] }
						}
					}
				}, function(err, data) {
					socket.emit('userlogin', data); 
        		});
        		

		      	let len = this.users.length;
		      	len--;
		      	this.io.emit('userList', this.users, this.users[len].id); 

		      	elasticsearch.search({
					index: 'user_history',
					type: 'doc',
					body: {
						query: {
							"match": { "user_id": user['name'] }
						}
					}
				}, function(err, resp) {
					var i = 0; 
    				if(resp.hits !== undefined){
                		for(i = 0; i < resp.hits.hits.length; i++) {
                			elasticsearch.search({
								index: 'routes2',
								type: 'doc',
								body: {
									query: {
										"match": { "id": resp.hits['hits'][i]._source.route_id }
									}
								}
							}, function(err, data1) {
					 			var history = ("From: " + data1.hits['hits'][0]._source.start_address
					 				+ " To: " + data1.hits['hits'][0]._source.end_address);
					 			socket.emit('routeHistoryLoaded', history);
        					});           
                		}
                	}
                	
        		});
		    });

			socket.on('userHistory',(data) => {
		     	es.index({
		     		index:'user_history',
		     		type:'doc',
		     		body:{
		     			'user_id':data[0],
		     			'route_id':data[1].id
		     		},function (err,resp){

		     		} 

		     	});

		     });

			socket.on('signup', (user) => {
		    	elasticsearch.index({
	        		index: 'userpoolfinal',
	        		type: 'doc',
	        		body: {
	        			"userName": user['name'],
	        			"password": user['password'],
	        			"userNamePass": user['name'] + user['password']
	        		}
	        	}, function (error, response) {
	        	});
	        	
		    }); 

		    socket.on('getMsg', (data) => {
		    	socket.broadcast.to(data.toid).emit('sendMsg', {msg:data.msg, name:data.name, toname:data.toname, id:data.id, toid:data.toid});
		    	elasticsearch.index({
	        		index: 'chathistory',
	        			type: 'doc',
	        		body: {
	        			"name": data.name,
	        			"with": data.toname,
	        			"fromto": "to", 
	        			"message": data.msg
	        		}
	        	}, function (error, response) {
	        	});
	        	elasticsearch.index({
	        		index: 'chathistory',
	        			type: 'doc',
	        		body: {
	        			"name": data.toname,
	        			"with": data.name,
	        			"fromto": "from", 
	        			"message": data.msg
	        		}
	        	}, function (error, response) {
	        	});
		    });

		    socket.on('pathdone', (data)=> {
		    	var Route = data[0]; 
		    	var userName = data[1]; 
		    	var start_location = Route.start_location;
		    	var start_lat = start_location['lat'];
		    	var start_lon = start_location['lng'];
		    	var end_location = Route.end_location;
		    	var distance = Route.distance.text;
		    	var duration = Route.duration.text;

				var jiyuan = new Date().getTime().toString().substring(6,10);

		    	elasticsearch.index({
	        		index: 'routes2',
	        			type: 'doc',
	        		body: {
	        			"id": jiyuan,
	        			"start_location": {"lat": start_lat, "lon": start_lon},
	        			"end_location": {"lat": end_location['lat'], "lon": end_location['lng']},
	        			"start_address": Route.start_address, 
	        			"end_address": Route.end_address, 
	        			"distance": distance, 
	        			"duration": duration,
	        			"rank": 0,
	        			"times": 1
	        		}
	        	}, function (error, response) {
	        	});

		    	elasticsearch.index({
	        		index: 'user_history',
	        			type: 'doc',
	        		body: {
	        			"route_id": jiyuan,
	        			"user_id": userName
	        		}
	        	}, function (error, response) {
	        	});

	        	elasticsearch.search({
       				index: 'routes2',
       				type: 'doc',
       				body: {
          				query: {
       						"match": {
        							"start_address": Route.start_address
       						}
             			}
        			}
       			},function (err, resp) {
       				if(resp != undefined){
        			//console.log("search by start: ", resp.hits.hits.length);
        			var pathlist = []; 
        			//var path_userlist = [];
                 	for(var i = 0; i < resp.hits.hits.length; i++) {
                 		//console.log(resp.hits.hits[i]._source.start_address, " @@ ", Route.start_address)
                 		//console.log(resp.hits.hits[i]._source.end_address, " @@ ", Route.end_address)
                  		if(resp.hits.hits[i]._source.start_address == Route.start_address && resp.hits.hits[i]._source.end_address == Route.end_address){
                   			pathlist.push(resp.hits.hits[i]);
                   			//console.log(pathlist); 
                   			console.log(resp.hits.hits[i]._source.start_address);
                   			console.log(resp.hits.hits[i]._source.end_address);
                   			
                  		}
                 	}
                 	console.log("pathlist: ", pathlist.length)

                 	//var path_userlist = [];
                 	elasticsearch.search({
       					index: 'user_history',
       					type: 'doc',
       					body: {
          					query: {
       							"match": {
        							"route_id": pathlist[0]._source.id
       							}
             				}
        				}
       				},function (err, userresp) {
       					console.log("meet ", userresp.hits.hits[0]._source.user_id)
       					socket.emit('sameroute', userresp.hits.hits[0]._source.user_id)
       				});
                 	
       				}
                });

		    });

		    socket.on('routeq', (data)=> { 
                es.search({
  					index: 'routes2',
  					type: 'doc',
  					body: {
     					query: {
							"match": {
								"start_address": data[0],
							}
         				}
    				}
    			},
    			function (err, resp) {
    				var i = 0; 
    				var pathlist = []; 
                	for(i = 0; i < resp.hits.hits.length; i++) {
                		if(resp.hits.hits[i]._source.start_address == data[0] && resp.hits.hits[i]._source.end_address == data[1]){
                			pathlist.push(resp.hits.hits[i]);
                		}
                	}
                	socket.emit('pathfound', pathlist);
            	});
            });

		    socket.on('disconnect',()=>{
		      	for(let i=0; i < this.users.length; i++){
		        	if(this.users[i].id === socket.id){
		          		this.users.splice(i,1); 
		        	}
		      	}
		      	this.io.emit('exit',this.users); 
		    });
		});
	}
	routesConfig(){
		this.appRoutes();
		this.socketEvents();
	}
}

class Server{

    constructor(){
        this.port =  process.env.PORT || 8081;
        this.host = `localhost`;
        this.app = express();
        this.http = http.Server(this.app);
        this.socket = socketio(this.http);
    }

    appConfig(){        
        this.app.use(
            bodyParser.json()
        );
        new Config(this.app);
    }

    includeRoutes(){
        new Routes(this.app,this.socket).routesConfig();
    }

    appExecute(){

        this.appConfig();
        this.includeRoutes();
        this.http.listen(this.port, this.host, () => {
            console.log(`Listening on http://${this.host}:${this.port}`);
        });
    }
}

const app = new Server();
app.appExecute();
