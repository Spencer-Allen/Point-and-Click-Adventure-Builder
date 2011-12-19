﻿$(function() {
// Objective Definitions
var theObjectives = [
	{objectiveTitle: 'open door', id: 'opendoor', order: 3},
	{objectiveTitle: 'pick up key', id: 'pickupkey', order: 1},
	{objectiveTitle: 'unlock door', id: 'unlockdoor', order: 2}
];
// Item Definitions
var items = [
	{ name: 'key',
		'type': 'inventory'
			//what we're really looking for here is that the inventory has added this key
	},
	{ name: 'door',
		'type': 'interactable',
		unlocked: false,
		'combineable': {
			accepts: 'key',
//replace with state reflecting what the model has been combined with
			sets: {
				'unlocked': true
			}
		},
		toggles: {
			on: {
				nextstate: 'off'
			},
			off: {
				nextstate: 'on'
			},
			'if': 'unlocked',
			'else': 'the door is locked',
			initial: 'off'
		}
	}
];






// Objective Model
var Objective = Backbone.Model.extend({
	defaults: {
		// The short text of the objective
		objectiveTitle: false,
		// The unique identifier for the objective
		id: false
	},
		//TODO: figure out how to make this private
	isComplete : false,
	markComplete: function () {
		console.log('here');
		isComplete = true;
		return this;
	},
	complete: function (state) {
		if (state !== undefined && state !== null) {
			isComplete = state;
			return this;
		}
		return isComplete;
	}
});

var ObjectiveList = Backbone.Collection.extend({
	model: Objective,
	comparator: function (objective) {
		return objective.get('order');
	}
});

var Item = Backbone.Model.extend({
	defaults: {}
});
var Items = Backbone.Collection.extend({
	model: Item
});

var InventoryItem = Item.extend({
	type: 'inventory'
});
var InteractableItem = Item.extend({
	defaults: {
		combineable: false,
		toggles: false
	},
	type: 'interactable',
	toggle: function () {
		if (this.toggles === false) {
			return false;
		}
		if (this.toggles['if'] === undefined || this.toggles['if'] !== undefined && this.toggles['if']) {
			//do toggle
			this.state = this.toggles[this.state].nextstate;
			return this;
		} else {
			return false;
			//display dialogue saying I cant do that
		}
	},
	initialize: function () {
		if (this.toggles !== false) {
			this.state = this.toggles.initial;
		}
	}
});

var Stage = Backbone.Model.extend({
	defaults: {
		items: false,
		interactables: false
	}
});

var Inventory = Backbone.Model.extend({
	defaults: {
		items: false
	}
});








var InventoryView = Backbone.View.extend({
	id: 'inventory',
	tagName: 'section',
	render: function () {
		$(this.el).append(this.inventoryItems.render().el);
	}
});

var InventoryItemsView = Backbone.View.extend({
	tag: 'ul',
	id: 'inventoryItems',
	initialize: function () {
		_.bindAll(this,'render');
		this.collection.bind('add', renderItem);
	},
	render: function () {
		this.collection.each(this.renderItem);
	},
	renderItem: function (item) {
		var view = new InventoryItemView({
			model: item,
			inventoryItems: this.collection
		});
		$(this.el).append(view.render().el);
	}
});

// This should have functions which are relevant to both InventoryItems and interactables
// is a inventory item rendered any different from a interactable?
var ItemView = Backbone.View.extend({
	initialize: function () {
		_.bindAll(this, 'render');
		this.model.bind('change', this.render);
		this.model.bind('remove', this.remove);
	},
	render: function () {
		//TODO: Fill this section out
		//$(this.el)
		return this;
	}
});

var InventoryItemView = ItemView.extend({
	tagName: 'li',
	initialize: function () {
		//call parent init
		ItemView.prototype.render.call(this);

		this.model.bind('combine', this.combined);
		this.model.bind('remove', this.remove);
	}
	combined: function () {
		this.options.inventoryItems.remove(this.model);
	}
});

var InteractableItemView = ItemView.extend({
	events: {
		'click': 'toggle'
	},
	initialize: function () {
		_.bindAll(this, 'render', 'toggle','drop');
		this.model.bind('change', this.render);
		// would need to be modified to handle multiple sets.
		this.model.bind('change:' + _.keys(this.model.combineable.sets)[0], this.render);
		if (this.model.has('combineable')) {
			$(this.el).droppable({
				drop: this.drop,
				hoverClass: 'drophover'
			});
			if (this.model.combineable.accepts !== undefined) {
				$(this.el).droppable('option', 'accept', '#' + this.model.combineable.accepts);
			}
		}
	},
	render: function () {
		ItemView.prototype.render.call(this);
		if (this.model.has('toggles')) {
			$(this.el).addClass(this.model.state);
		}
		return this;
	},
	toggle: function () {
		//when this fails should we call dialogue directly here?
		//does dialogue have a model?
		this.model.toggle();
	},
	drop: function (event, ui) {
		if (this.model.combineable.sets !== undefined) {
			this.model.set(this.model.combineable.sets);
		}
		$(ui.draggable).trigger('combined');
	}
});

var PickupItemView = ItemView.extend({
});

var StageView = Backbone.View.extend({
	id: 'stage',
	initialize: function () {
		_.bindAll(this, 'render');
	},
	render: function () {
		_(this.model.items.models).each(function (item) {
			this.appendItem(item);
		}, this);
		return this;
	},
	appendItem: function (item) {
		var itemView = new ItemView ();
		$(this.el).append(itemView.render().el);
	}
});

var ObjectiveView = Backbone.View.extend({
	tagName: 'li',
	initialize: function () {
		_.bindAll(this,'render');
		this.model.bind('change',this.render);
	},
	render: function () {
		$(this.el).text(this.model.get('objectiveTitle'));
		if (this.model.isComplete) {
			$(this.el).addClass('met');
		}
		return this;
	}
});

var ObjectivesListView = Backbone.View.extend({
	id: 'objectives',
	tagName: 'ol',
	initialize: function () {
		_.bindAll(this,'render','appendObjective');
		this.collection = this.options.objectives;
		this.collection.bind('add',this.appendObjective);
		this.render();
	},
	render: function () {
		_(this.collection.models).each(function (objective) {
			this.appendObjective(objective);
		},this);
		return this;
	},
	appendObjective: function (objective) {
		var objectiveView = new ObjectiveView({el: '#' + objective.id, model: objective, id: objective.id});
		$(this.el).append(objectiveView.render().el);
		return this;
	}
});






var stage = new Stage({items: new Items(items)});
var inventory = new Inventory();
var theobjectives = new ObjectiveList(theObjectives);




window.BackboneTunes = Backbone.Router.extend({
	routes: {
		'': 'home',
		'blank': 'blank'
	},

	initialize: function() {
		this.objectivesView = new ObjectivesListView({
			el: '#objectives',
			objectives: theobjectives
		});

		this.inventoryView = new inventoryView({
			model: inventory
		});

		this.stageView = new StageView({
			model: stage
		});
	},

	home: function() {
		$('body').empty()
			.append(this.inventoryView.render().el)
			.append(this.stageView.render().el)
			.append(this.objectivesView.render().el);
	},

	blank: function() {
		$('#container').empty();
		$('#container').text('blank');
	}
});



var objectivesDOM = $('#objectives li');
// util function?
var applyChanges = function(changes) {
	for (var prop in changes) {
		$(this).css(prop, changes[prop]);
	}
};
 //TODO: create Game Object
var game = (function(dialogueid) {
	dialogueSelector = '#' + dialogueid;
	var removeDialogue = function() {
		$(dialogueSelector).fadeOut(400, function(e) {
			$(this).remove();
		});

	};
	var dialogue = function(message, timeout) {
		timeout = timeout || 2;
		$('<div />').text(message).appendTo('body').attr('id', dialogueid);
		window.setTimeout(removeDialogue, timeout * 1000);
	};
	return {
		dialogue: dialogue
	};
})('dialogue');

// Something for operating on our objectives
var inventoryback = (function(inventorySelector) {
	var addToInventory = function(item) {
		//this is the inventory object
		$(item).appendTo(inventorySelector);
		$(item).draggable({
			containment: 'body',
			zIndex: 200,
			revert: 'invalid'
		});
	};
	return {
		add: addToInventory
	};
})('#inventory');

// creates items (optional) and returns a stage object
var stageback = (function() {
	var createItem = function(item, id) {
		if (item.type === 'inventory') {
			$('#' + id).on('click', function(e) {
				inventory.add(this);
				if (item.pickup) {
				//console.log(item.pickup, id);
					$('#' + item.pickup).trigger(item.pickup);
				}
			});
		} else if (item.type === 'interactable') {
			if (item.toggles) {
				var initial = item.toggles[item.toggles.initial];
				applyChanges.call($('#' + id).data('nextstate', initial.nextstate).get(0), initial.changes);
			}
			$('#' + id).on('click', function(e) {
				if (item.toggles) {
					var newstatename = $(this).data('nextstate'),
					newstate = item.toggles[newstatename],
					condition = item.toggles['if'];

					if (condition === null || condition !== null && $(this).data(condition)) {
						applyChanges.call(this, newstate.changes);
						if (newstate.triggers) {
							objectivesDOM.trigger(newstate.triggers);
						}
						$(this).data('nextstate', newstate.nextstate);
					} else {
						game.dialogue(item.toggles['else']);
					}
				}
			//set up a one time handler here
			});
		} else {
			alert('type not handled: ' + item.type);
		}

		if (item.combineable) {
			if (item.combineable.accepts) {
				$("#" + id).droppable({
					drop: function(event, ui) {
						$(this).data(item.combineable.sets.key, item.combineable.sets.value);
						applyChanges.call(this, item.combineable.changes);
						theobjectives2.trigger(item.combineable.triggers);
						$(ui.draggable).remove();
					},
					hoverClass: 'drophover'
				});
			}
			//TODO: Else it accepts everything?
		}
	};
	return function(items) {

		if (items) {
			for (var id in items) {
				var item = items[id];
				createItem(item, id);
			}
		}
		return {
			createItem: createItem
		};
	};
})();

});
