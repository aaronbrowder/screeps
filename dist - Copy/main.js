// acrobat

var spawnManager = require('manager.spawn');
var roleManager = require('manager.roles');
var mobilization = require('mobilization');
var structureLink = require('structure.link');
var builderAssignment = require('assignment.builder');
var transporterAssignment = require('assignment.transporter');

module.exports.loop = function () {
    
    //Memory.siegeMode = false;
    
    if (!Memory.rooms) {
        Memory.rooms = {};
    }
    
    mobilization.runDefenseSystems();
    // spawning must run before roles are run
    spawnManager.run();
    roleManager.run();
    // assignment must happen after roles have been run
    builderAssignment.assignBuilders();
    transporterAssignment.assignTransporters();
    structureLink.runAll();
    collectGarbage();
    
    function collectGarbage() {
        for (var i in Memory.creeps) {
            if (!Game.creeps[i]) {
                delete Memory.creeps[i];
            }
        }  
        for (var i in Memory.flags) {
            if (!Game.flags[i]) {
                delete Memory.flags[i];
            }
        }  
    }
}