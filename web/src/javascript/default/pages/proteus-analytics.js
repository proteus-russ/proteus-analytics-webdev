(function (w, d) {

	// FUTURE <russ!@proteus.co> : Add hit data queue and unload/onbeforeunload event listeners that send
	//	pending queue elements via synchronous XMLHttpRequests.

	w.PA_DEBUG = false;
	const isString = val => typeof val === 'string';
	const isBlob = val => val instanceof Blob;

	beaconPolyfill(w);

	function beaconPolyfill(w) {
		if (('navigator' in w) && ('sendBeacon' in w.navigator)) return;
		if (!('navigator' in w)) w.navigator = {};
		w.navigator.sendBeacon = sendBeaconPoly.bind(w);
	}

	function sendBeaconPoly(url, data) {
		const event = w.event && w.event.type;
		const sync = event === 'unload' || event === 'beforeunload';

		const xhr = ('XMLHttpRequest' in w) ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
		xhr.open('POST', url, !sync);
		xhr.withCredentials = true;
		xhr.setRequestHeader('Accept', '*/*');


		if (isString(data)) {
			xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
			xhr.responseType = 'text/plain';
		} else if (isBlob(data) && data.type) {
			xhr.setRequestHeader('Content-Type', data.type);
		}

		try {
			xhr.send(data);
		} catch (error) {
			return false;
		}

		return true;
	}

	const HIT_TYPE_EVENT = Object.freeze([
		'category',
		'action',
		'label',
		'value'
	]);

	const BUILD_HIT_TASK = "buildHitTask";
	const SEND_HIT_TASK = "sendHitTask";
	const HIT_PAYLOAD = "hitPayload";
	const PAYLOAD_HIT_TYPE = "hitType";
	const TRACKERS = [];
	const PLUGINS = {};

	function buildHitTask(model) {
		let payload = {};
		for (let key in model.data) {
			let value = model.data[key];
			if (value == null || typeof value == "function" || typeof value == "object" || typeof value == "undefined"
					|| key.indexOf("&") == 0) {
				continue;
			}
			payload[key] = value;
		}
		model.set(HIT_PAYLOAD, payload);
		if (PA_DEBUG) console.log("buildHitTask", payload);
	}

	function sendHitTask(model) {
		const payload = model.get(HIT_PAYLOAD);
		const stringified = JSON.stringify(payload);
		if (PA_DEBUG) console.log("sendHitTask", stringified);
		const blob = new Blob([stringified], {type: 'text/plain'});
		navigator.sendBeacon(model.endpoint, blob);
	}

	class Model {
		constructor(endpoint) {
			this.data = {};
			this.endpoint = endpoint;
		}

		get(key) {
			if (PA_DEBUG) console.log("get", key);
			return this.data[key];
		}

		set(key, value) {
			if (PA_DEBUG) console.log("set", key, value);
			if (typeof key == "object" && key != null && value == null) {
				Object.assign(this.data, key);
			} else {
				this.data[key] = value;
			}
		}

	}

	class ProteusAnalytics extends Model {

		constructor(name, endpoint) {
			super(endpoint);
			this.name = name;
			TRACKERS.push(this);

			this.set(BUILD_HIT_TASK, buildHitTask);
			this.set(SEND_HIT_TASK, sendHitTask);
			this.set("location", w.location.href);
			this.set("page", location.pathname);
			const meta = d.querySelector('meta[http-equiv="X-Request-ID"]');
			if (meta)
				this.set("requestId", meta.getAttribute("content"));
		}

		handleEvent(...args) {
			this.get(BUILD_HIT_TASK).call(this, this);
			const hitPayload = this.get(HIT_PAYLOAD);
			for (let i = 0; i < args.length; i++) {
				let arg = args[i];
				if (arg == null) continue;
				if (typeof arg != "object") {
					hitPayload[HIT_TYPE_EVENT[i]] = arg;
				} else {
					for (let key in arg) {
						// noinspection JSUnfilteredForInLoop
						hitPayload[key] = arg[key];
					}
				}
			}
			for (let key in hitPayload) {
				if(key.startsWith("event")) {
					let value = hitPayload[key];
					delete hitPayload[key];
					let newKey = key.substring(5);
					newKey = newKey[0].toLowerCase() + newKey.substring(1);
					hitPayload[newKey] = value;
				}
			}
			hitPayload[PAYLOAD_HIT_TYPE] = "event";
			this.get(SEND_HIT_TASK).call(this, this);
		}

		send(...args) {
			if (PA_DEBUG) console.log("send", args);
			let hitType = args[0];
			args = args.slice(1);
			switch (hitType) {
				case "event": {
					this.handleEvent(...args);
					break;
				}
				default: {
					throw new Error("Unsupported hit type: " + hitType);
				}
			}
		}

		require(pluginName, opts) {
			if (PA_DEBUG) console.log("require", pluginName, opts);
			new PLUGINS[pluginName](this, opts);
		}

		static getAll() {
			return TRACKERS.slice(0);
		}

		static getByName(name) {
			return TRACKERS.find(value => value.name == name);
		}

		static create(name, collector) {
			this.checkIfInUse(name);
			new ProteusAnalytics(name, collector);
		}

		static remove(name) {
			// not implemented
			if (PA_DEBUG) console.log("remove", name);
		}

		static provide(pluginName, pluginConstructor) {
			this.checkIfInUse(pluginName);
			if (PA_DEBUG) console.log("provide", pluginName, pluginConstructor);
			PLUGINS[pluginName] = pluginConstructor;
		}

		static checkIfInUse(name) {
			if (this.getByName(name))
				throw new Error("Name in use by tracker: " + name);
			if (name in PLUGINS)
				throw new Error("Name in use by plugin: " + name);
		}
	}

	function pa(...args) {
		if (PA_DEBUG) console.log("pa", args);
		let command = args[0];
		if (command.indexOf(":") != -1)
			throw new Error("Do not currently support named trackers / plugins");
		let owner = null;
		let fun = null;
		if (ProteusAnalytics[command]) {
			owner = ProteusAnalytics;
			fun = ProteusAnalytics[command];
		} else {
			owner = TRACKERS[0]; //ProteusAnalytics.getByName(name);
			if (owner != null)
				fun = owner[command];
		}
		if (fun != null) {
			return fun.apply(owner, args.slice(1));
		} else {
			if (owner != null)
				console.error("Unable to find function.", args);
			else
				console.error("Unable to find owner.", args);
		}
	}

	if (w.pa && w.pa.q) {
		w.pa.q.forEach((args) => pa(args));
	}

	w.pa = pa;

})(window, document);