﻿$(function() {
// Objective Definitions
var theObjectives = [
	{objectiveTitle: 'open door', id: 'opendoor', order: 3, object: 'door', 'var': {state: 'on'}},
	{objectiveTitle: 'pick up key', id: 'pickupkey', order: 1, object: 'key', pickup: true},
	{objectiveTitle: 'unlock door', id: 'unlockdoor', order: 2, object: 'door', 'var': {unlocked: true}}
];
// Item Definitions
var items = {
	items: [{ id: 'key', active: false}],
	interactables: [{
		id: 'door',
		unlocked: false,
		active: true,
		combineable: {
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
	},
	{
		id: 'bed',
		open: false,
		active: true,
		events: {click: ['open']},
		produces: {
			object:'key',
			on: 'open'
		}
	}]
};

/**
 * Objective Definitions
 */

// Objective Model
var Objective = Backbone.Model.extend({
	//TODO: figure out how to make this private
	isComplete : false,
	markComplete: function () {
		this.set({'isComplete': true});
		return this;
	},
	complete: function (state) {
		if (state !== undefined && state !== null) {
			this.model.set({'isComplete': state});
			return this;
		}
		return this.get('isComplete');
	}
});

var ObjectiveList = Backbone.Collection.extend({
	model: Objective,
	comparator: function (objective) {
		return objective.get('order');
	}
});

var Item = Backbone.Model.extend({
}),
	PickupItem = Item.extend({
}),
	InteractableItem = Item.extend({
	toggle: function () {
		var cond, toggle = this.get('toggles');
		if (!this.has('toggles')) {
			return false;
		}
		if (toggle['if'] !== undefined && this.get(toggle['if']) !== true) {
			this.trigger('failedToggleCondition', toggle['else']);
			return false;
		} else {
			this.set({previousState: this.get('state')});
			this.set({state : toggle[this.get('state')].nextstate});
			return this;
		}
	},
	initialize: function () {
		if (this.has('toggles')) {
			this.set({state : this.get('toggles').initial});
		}
	}
});
var Items = Backbone.Collection.extend({
	model: Item
});
var PickupItems = Items.extend({
	model: PickupItem
});
var InteractableItems = Items.extend({
	model: InteractableItem
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
	},
	initialize: function () {
		if (!this.get('items')) {
			this.set({'items': new Items()});
		}
	}
});

var Dialogue = Backbone.Model.extend({});

/**
 * View Definitions
 *
 */

// This should have functions which are relevant to both InventoryItems and interactables
// is a inventory item rendered any different from a interactable?
var ItemView = Backbone.View.extend({
	className: 'item',
	initialize: function () {
		_(this).bindAll('render', 'remove', 'renderSetableChange', 'renderSetable');
		//this.model.bind('change', this.render);
		this.model.bind('remove', this.remove);
		this.model.bind('change:active', this.renderSetableChange);
		this.el.id = this.model.get('id');
	},
	renderSetableChange: function (model, value){
		var changed = model.changedAttributes();
		_(changed).map(this.renderSetable, this);
	},
	renderSetable: function (stateVal, stateName) {
		console.log(stateVal,stateName);
		if (this.model.get(stateName) === stateVal) {
			$(this.el).addClass(stateName);
		} else {
			$(this.el).removeClass(stateName);
		}
		return this;
	},
	render: function () {
		this.renderSetable(true, 'active');
		return this;
	}
});

var InventoryItemView = ItemView.extend({
	tagName: 'li',
	events: {
		'combined': 'combined'
	},
	initialize: function () {
		//call parent init
		ItemView.prototype.initialize.call(this);

		//this.model.bind('remove', this.remove);
		$(this.el).draggable({
			containment: 'body',
			zIndex: 200,
			revert: 'invalid'
		});
	},
	combined: function () {
		this.options.inventoryItems.remove(this.model);
	}
});

var InteractableItemView = ItemView.extend({
	initialize: function () {
		var combineable;
		ItemView.prototype.initialize.call(this);
		_(this).bindAll('toggle', 'drop','produce', 'open', 'renderState', 'showFailedToggle');
		this.model.bind('change:state', this.renderState);
		this.model.bind('change:open', this.renderSetableChange);
		this.model.bind('failedToggleCondition', this.showFailedToggle);
		if (this.model.has('produces')) {
			this.model.bind('change:' + this.model.get('produces').on, this.produce);
		}
		if (this.model.has('toggles')) {
			this.delegateEvents({'click': 'toggle'});
		}
		if (this.model.has('events')) {
			_(this.model.get('events')).each(function (val, key) {
				var obj = {};
				_(val).each(function (arVal) {
					obj[key] = arVal;
					this.delegateEvents(obj);
				},this);
			}, this);
		}
		if (this.model.has('combineable')) {
			combineable = this.model.get('combineable');
			this.model.bind('change:' + _(combineable.sets).keys()[0], this.renderSetableChange);
			$(this.el).droppable({
				drop: this.drop,
				hoverClass: 'drophover'
			});
			if (combineable.accepts !== undefined) {
				$(this.el).droppable('option', 'accept', '#' + combineable.accepts);
			}
		}
	},
	render: function () {
		ItemView.prototype.render.call(this);
		if (this.model.has('state')) {
			this.renderState();
		}
		if (this.model.has('combineable') && this.model.get('combineable').sets !== undefined) {
			_(this.model.get('combineable').sets).map(this.renderSetable, this);
		}
		return this;
	},
	produce: function () {
		this.collection.get(this.model.get('produces').object).set({active: true});
	},
	open: function () {
		this.model.set({'open': true});
	},
	toggle: function () {
		this.model.toggle();
		return this;
	},
	drop: function (event, ui) {
		if (this.model.get('combineable').sets !== undefined) {
			this.model.set(this.model.get('combineable').sets);
		}
		$(ui.draggable).trigger('combined');
		return this;
	},
	renderState: function () {
		if (this.model.has('previousState')) {
			$(this.el).removeClass(this.model.get('previousState'));
		}
		$(this.el).addClass(this.model.get('state'));
		return this;
	},
	showFailedToggle: function (msg) {
		var dialogue = new DialogueView({model: new Dialogue({message: msg})});
		$('#main').append(dialogue.render().el);
		return this;
	}
});

var PickupItemView = ItemView.extend({
	events: {
		'click': 'pickup'
	},
	pickup: function () {
		this.collection.trigger('pickup', this.model);
		this.model.trigger('pickup', this.model);
	}
});

var StageView = Backbone.View.extend({
	id: 'stage',
	initialize: function () {
		_(this).bindAll('render','appendItem');
	},
	render: function () {
		_(this.model.get('items').models).each(function (item) {
			this.appendItem(item, 'pickup');
		}, this);
		_(this.model.get('interactables').models).each(function (item) {
			this.appendItem(item, 'interactable');
		}, this);
		return this;
	},
	appendItem: function (item, type) {
		var view, options = {el: '#' + item.id, model: item, collection: this.model.get('items')};
		if (type === 'pickup') {
			view = new PickupItemView (options);
		} else {
			view = new InteractableItemView (options);
		}

		$(this.el).append(view.render().el);
	}
});

var ObjectiveView = Backbone.View.extend({
	tagName: 'li',
	initialize: function () {
		_(this).bindAll('render', 'pickup', 'stateChange');
		this.model.bind('change', this.render);
		if (this.model.has('pickup')) {
			this.options.stageItems.get(this.model.get('object')).bind('pickup', this.pickup);
		}
		if (this.model.has('var')) {
			this.options.interactables.get(this.model.get('object')).bind('change:' + _(this.model.get('var')).keys()[0], this.stateChange);
		}
	},
	render: function () {
		if (this.model.get('isComplete')) {
			$(this.el).addClass('met');
		}
		$(this.el).text(this.model.get('objectiveTitle'));
		return this;
	},
	pickup: function (item) {
		this.model.set({'isComplete': true});
	},
	stateChange: function (what) {
		var changed = what.changedAttributes(),
			al = this.model.get('var'),
			key = _(al).keys()[0];
		if (al[key] === changed[key]) {
			this.model.set({isComplete: true});
			what.unbind('change:' + key, this.stateChange);
		}
	}
});

var ObjectivesListView = Backbone.View.extend({
	id: 'objectives',
	tagName: 'ol',
	initialize: function () {
		_(this).bindAll('render', 'appendObjective');
		this.collection = this.options.objectives;
		this.collection.bind('add', this.appendObjective);
	},
	render: function () {
		_(this.collection.models).each(function (objective) {
			this.appendObjective(objective);
		},this);
		return this;
	},
	appendObjective: function (objective) {
		var objectiveView = new ObjectiveView({
			el: '#' + objective.id,
			model: objective,
			stageItems: this.options.stageItems,
			interactables: this.options.interactables});
		$(this.el).append(objectiveView.render().el);
		return this;
	}
});

var InventoryView = Backbone.View.extend({
	id: 'inventory',
	tagName: 'section',
	render: function () {
		var view = new InventoryItemsView({collection: this.model.get('items'), stage: this.options.stage});
		$(this.el).append(view.render().el);
		return this;
	}
});

var InventoryItemsView = Backbone.View.extend({
	tagName: 'ul',
	id: 'inventoryItems',
	initialize: function () {
		_(this).bindAll('render', 'renderItem', 'pickup');
		this.collection.bind('add', this.renderItem);
		this.stageItems = this.options.stage.get('items');
		this.stageItems.bind('pickup', this.pickup);
	},
	render: function () {
		this.collection.each(this.renderItem);
		return this;
	},
	renderItem: function (item) {
		var view = new InventoryItemView({
			model: item,
			inventoryItems: this.collection
		});
		$(this.el).append(view.render().el);
		return this;
	},
	pickup: function (item) {
		this.stageItems.remove(item);
		this.collection.add(item);
		return this;
	}
});

var DialogueView = Backbone.View.extend ({
	id: 'dialogue',
	initialize: function () {
		_(this).bindAll('render', 'remove');
		this.model.bind('remove', this.remove);
	},
	render: function () {
		$(this.el).text(this.model.get('message'));
		var tmp = function (model) {model.trigger('remove');};
		_(tmp).delay(2000, this.model);
		return this;
	},
	remove: function () {
		$(this.el).fadeOut(400, function (e) {
			$(this).remove();
		});
	}
});

/**
 * Model kickstart.
 */
window.stage = new Stage({
	items: new PickupItems(items.items),
	interactables: new InteractableItems(items.interactables)
});
var inventory = new Inventory();
var theobjectives = new ObjectiveList(theObjectives);

/**
 * Router Definition
 */
var PointAndClickGame = Backbone.Router.extend({
	routes: {
		'': 'home',
		'blank': 'blank'
	},

	initialize: function () {
		this.objectivesView = new ObjectivesListView({
			el: '#objectives',
			objectives: theobjectives,
			interactables: stage.get('interactables'),
			stageItems: stage.get('items')
		});

		this.inventoryView = new InventoryView({
			model: inventory,
			stage: stage,
			el: '#inventory'
		});

		this.stageView = new StageView({
			model: stage,
			el: '#stage'
		});
		
	},

	home: function() {
		$('#main').append(this.inventoryView.render().el)
			.append(this.stageView.render().el)
			.append(this.objectivesView.render().el);
	},

	blank: function() {
		$('#container').empty();
		$('#container').text('blank');
	}
});


	window.App = new PointAndClickGame();
	Backbone.history.start();

});
