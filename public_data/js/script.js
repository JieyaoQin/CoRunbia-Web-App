'use strict';

const app = angular.module('app',[]);

app.factory('socket', function ($rootScope) {
    const socket = io.connect();
	return {
		on: function (eventName, callback) {
			socket.on(eventName, function () {  
				var args = arguments;
				$rootScope.$apply(function () {
			  		callback.apply(socket, args);
				});
		  	});
		},
		emit: function (eventName, data, callback) {
		  	socket.emit(eventName, data, function () {
				var args = arguments;
				$rootScope.$apply(function () {
			  		if (callback) {
						callback.apply(socket, args);
			  		}
				});
		  	})
		}
  	};
});

app.controller('app', ($scope, $http, socket) => {

	$scope.socketId = null;
	$scope.selectedUser = null;
	$scope.selectedPath = null;
	$scope.messages = [];
	$scope.ownmessages = [];
	$scope.oldmessages = [];
	$scope.msgData = null;
	$scope.userList = [];
	$scope.resultList = []; 
	$scope.meetList = [];
	$scope.routeHistoryList = []; 
	$scope.connect = () => {
		$scope.userName = window.prompt('Enter Your Name'); 
		$scope.password = window.prompt('Enter Your Password');
		if (!userlists.includes($scope.userName)) {
			window.location.reload();
		}else{
			socket.emit('username',{name: $scope.userName, password: $scope.password});
		}
	};
	
	if ($scope.userName === '') {
		window.location.reload();
	}

	$scope.seletedUser = (selectedUser) => {
		selectedUser.id === $scope.socketId ? alert("Can't message to yourself.") : $scope.selectedUser = selectedUser;
	};

	$scope.uploadRoute = () => {
		socket.emit('pathdone', [Route, $scope.userName]); 
		$scope.routeHistoryList.push("From: " + Route.start_address + " To: " + Route.end_address); 
	};

	$scope.showHistory = () => {
	};

	$scope.searchRoute = () => {
		$scope.resultList = []; 
		socket.emit('routeq', [start2, dest2]); 
	};

	$scope.selectRoute = (path) => {
		$scope.selectedPath = path;
		spath = path;
	};

	$scope.signup = () => {
		$scope.userName = window.prompt('Enter Your Name'); 
		$scope.password = window.prompt('Enter Your Password');
		socket.emit('signup',{name: $scope.userName, password: $scope.password});
	};

	$scope.searchHistory = ()=>{
		$scope.routeHistoryList.push("From: "+start2+"to: "+dest2);
	};

	$scope.uploadHistory = ()=>{
		socket.emit('userHistory',[$scope.userName, Route]);
	};

	$scope.sendMsg = ($event) => {
		const keyCode = $event.which || $event.keyCode;	
	    if (keyCode === 13 && $scope.message !== null) {
	        socket.emit('getMsg',{
	        	toid : $scope.selectedUser.id,
	        	toname : $scope.selectedUser.userName,
	    		msg : $scope.message,
	    		id : $scope.socketId, 
	    		name : $scope.userName
	        });
	        var data = {
	        	toid : $scope.selectedUser.id, 
	        	toname : $scope.selectedUser.userName, 
	        	msg : $scope.message, 
	        	id : $scope.socketId, 
	        	name : $scope.userName
	        };
	        $scope.ownmessages.push(data);
	        $scope.message = null; 
        }	    
	};

	socket.on('userloaded', (userName, str) => {
		var res = str['hits']['hits'];
		var i = 0; 
		for(i = 0; i < res.length; i++) {
			if(res[i]['_source'].fromto == "to") {
				var data = {
					toname: res[i]['_source'].with,
					name: "you",
					message: res[i]['_source'].message
				}
				$scope.oldmessages.push(data); 
			}
			else {
				var data = {
					name: res[i]['_source'].with,
					toname: "you",
					message: res[i]['_source'].message
				}
				$scope.oldmessages.push(data); 
			}
		}
	});

	socket.on('sameroute', (data) => {
    	$scope.meetList.push(data);
	});

	socket.on('userList', (userList,socketId) => {
    	if($scope.socketId === null){
    	    $scope.socketId = socketId;
    	}
    	$scope.userList = userList;
	}); 	
	
	socket.on('userlogin', (data) => {
		if(data['hits']['hits'].length === 0){
			window.location.reload();
			alert("Login failed. Please login again.")
		}else{
			alert("Successfully logged in!");
		}
	});

	socket.on('routeHistoryLoaded', (history) => {
    	$scope.routeHistoryList.push(history);
	});

	socket.on('exit', (userList) => {
		$scope.userList = userList;
	});

	socket.on('sendMsg', (data) => {
		$scope.messages.push(data);
	});

	socket.on('pathfound', (pathlist) => {
		$scope.resultList = pathlist; 
	});
});
