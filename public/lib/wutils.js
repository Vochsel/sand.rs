/* -------------- Core Web Utils ------------- */
var wutils = {
	data: {
		/* ======= Quick Data Object =======
			 - Author: Ben Skinner
			 - Params: 
			 	- val (initial value of data)
			 - Return: 
			 	- Quick Data Object
		*/
		create: function(val) {
			/* ======= Creates Inlet =======
				 - Author: Ben Skinner
				 - Desc: Adds event listener to @evt to change value of data
				 - Private internal function
				 - Params: 
				 	- qd (Quick Data reference)
				 	- dom (Direct HTML DOM reference)
				 	- evt (String of event to listen for)
				 - Return: 
				 	- Quick Data Object
			*/
			var CreateInlet = function(qd, dom, evt) {
				//Temporary data value
				var t = qd;
				//Add event listener to input of DOM
				dom.addEventListener(evt, function(e) {

					t.update(e.target.value);
				});
				//Push input reference into array of inputs
				qd.inlets.push(dom);
				//Update data value
				qd.update(qd.value);
			}
			/* ======= Creates Outlet =======
				 - Author: Ben Skinner
				 - Desc: Adds event listener to @evt to change value of data
				 - Private internal function
				 - Params: 
				 	- qd (Quick Data reference)
				 	- dom (Direct HTML DOM reference)
					- callback (function callback called on data change)
				 - Return: 
				 	- Quick Data Object
			*/
			var CreateOutlet = function(qd, callback, data_ref) {
				//Build outlet variable with dom reference, and outlet callback
				var out = {
					callback: callback,
					data: data_ref
				};
				//Push output reference
				qd.outlets.push(out);
				//Updata data value
				qd.update(qd.value);
			}

			return {
				value: val,
				inlets: [],
				outlets: [],
				/* ======= Update data =======
					 - Author: Ben Skinner
					 - Desc: Updates value and updates all callbacks for inlets and outlets
					 - Params: 
					 	- v (value to set to)
					 - Return: 
					 	- Quick Data Object
				*/
				update: function(v) {
					//Update internal value if argument
					if(v !== undefined)
						this.value = v;
					
					//Update all outlets
					for(var i=0; i<this.outlets.length; i++) {
						//Pass through value and data reference
						this.outlets[i].callback(this.value, this.outlets[i].data);
					}

					//Update all inlets
					for(var i=0; i<this.inlets.length; i++) {
						this.inlets[i].value = this.value;
					}
				},
				/* ======= Adds inlet =======
					 - Author: Ben Skinner
					 - Desc: adds inlet to array
					 - Params: 
					 	- doms_str (identification of dom)
					 	- evt (optional event string)
					 - Return: 
					 	- Quick Data Object
				*/
				inlet: function(doms_str, evt) {
					//Select necessary DOM elements
					var doms = wutils.dom.getAll(doms_str);

					//Default setting of evt
					if(evt === undefined)
						evt = "input";

					//If single DOM element
					if(doms.constructor !== Array) {
						CreateInlet(this, doms, evt);
					} else {
						//Otherwise loop and add all DOM elements
						for(var i = 0; i < doms.length; ++i) {
							CreateInlet(this, doms[i], evt);
						}
					}
					return this;
				},
				/* ======= Adds outlet =======
					 - Author: Ben Skinner
					 - Desc: adds outlet to array
					 - Params: 
						- callback (function to call on value updated)
					 	- data_ref (external data reference to be passed through)
					 - Return: 
					 	- Quick Data Object
				*/
				outlet: function(callback, data_ref) {
					//Create outlet
					CreateOutlet(this, callback, data_ref);
					return this;
				}
			}
		},
		/* ======= Quick Data Presets =======
			 - Author: Ben Skinner
			 - Members: 
			 	- HTML (Replaces innerHTML with value)
			 	- Attribute (Sets attribute @attr with value)
		*/
		presets: {
			HTML: function(value, data_ref) {
				//If single DOM element
				if((data_ref.constructor !== HTMLCollection) && (data_ref.constructor !== Array)) {
					data_ref.innerHTML = value;
				} else {
					//Otherwise loop and add all DOM elements
					for(var i = 0; i < data_ref.length; ++i) {
						data_ref[i].innerHTML = value;
					}
				}
			},
			TextArea: function(value, data_ref) {
				//If single DOM element
				if((data_ref.constructor !== HTMLCollection) && (data_ref.constructor !== Array)) {
					data_ref.value = value;
				} else {
					//Otherwise loop and add all DOM elements
					for(var i = 0; i < data_ref.length; ++i) {
						data_ref[i].value = value;
					}
				}
			},
			Attribute: function(value, data_ref) {
				if((data_ref.dom.constructor !== HTMLCollection) && (data_ref.dom.constructor !== Array)) {
					if(data_ref.dom.setAttribute === undefined)
						data_ref.dom[data_ref.attr] = value;
					else
						data_ref.dom.setAttribute(data_ref.attr, value);
				} else {
					for(var i = 0; i < data_ref.dom.length; ++i) {
						if(data_ref.dom[i].setAttribute === undefined)
							data_ref.dom[i].attr = value;
						else
							data_ref.dom[i].setAttribute(data_ref.attr, value);
					}
				}
				
			}
		}
	},
	dom: {
		/* ======= Get element by ambiguous identifier =======
			 - Author: Ben Skinner
			 - Params: 
			 	- id (identifier to search for)
			 - Return: 
			 	- single element / array of elements
		*/
		get: function(id) {
			//Initialize e as null
			var e = null;

			//Temporary storage
			var tmp = [];

			//Try all dom accessors
			if(e == null) {
				e = document.getElementById(id);
				if(e != null)
					return e;
			}
			if(e == null) {
				tmp = document.getElementsByClassName(id);
				if(tmp.constructor === HTMLCollection && tmp.length > 0) {
					e = (tmp.length > 1) ? tmp : tmp[0];
					return e;
				}
			}
			if(e == null) {
				tmp = document.getElementsByName(id);
				if(tmp.constructor === HTMLCollection && tmp.length > 0) {
					e = (tmp.length > 1) ? tmp : tmp[0];
					return e;
				}
			}
			if(e == null) {
				tmp = document.getElementsByTagName(id);
				if(tmp.constructor === HTMLCollection && tmp.length > 0) {
					e = (tmp.length > 1) ? tmp : tmp[0];
					return e;
				}
			}
			if(e == null) {
				tmp = document.getElementsByTagNameNS(wutils.external.ns.svg, id);
				if(tmp.constructor === HTMLCollection && tmp.length > 0) {
					e = (tmp.length > 1) ? tmp : tmp[0];
					return e;
				}
			}

			//Return e
			return e;
		},
		/* ===== Get all element by ambiguous identifier ======
			 - Author: Ben Skinner
			 - Params: 
			 	- id (identifier to search for)
			 - Return: 
			 	- Appended array of elements
		*/
		getAll: function(id) {
			//Initialize e as array
			var e = [];

			//Initialize temporary holder
			var tmp = null;

			//Get single element by ID
			tmp = document.getElementById(id);
			if(tmp != null)
				e.push(tmp);

			//Get all elements by class name
			tmp = document.getElementsByClassName(id);
			//Check if not null and if is a HTMLCollection
			if(tmp != null && tmp.constructor === HTMLCollection) {
				//Loop through all HTML elements
				for(var i = 0; i < tmp.length; ++i) {
					//Store individual elements
					var t = tmp[i];
					//Store individual element
					e.push(t);
				}
			}

			//Get all elements by tag name
			tmp = document.getElementsByTagName(id);
			//Check if not null and if is a HTMLCollection
			if(tmp != null && tmp.constructor === HTMLCollection) {
				//Loop through all HTML elements
				for(var i = 0; i < tmp.length; ++i) {
					//Store individual elements
					var t = tmp[i];
					//Store individual element
					e.push(t);
				}
			}

			//Get all elements by name
			tmp = document.getElementsByName(id);
			//Check if not null and if is a HTMLCollection
			if(tmp != null && tmp.constructor === HTMLCollection) {
				//Loop through all HTML elements
				for(var i = 0; i < tmp.length; ++i) {
					//Store individual elements
					var t = tmp[i];
					//Store individual element
					e.push(t);
				}
			}

			//Get all elements by NS: SVG
			tmp = document.getElementsByTagNameNS(wutils.external.ns.svg, id);
			//Check if not null and if is a HTMLCollection
			if(tmp != null && tmp.constructor === HTMLCollection) {
				//Loop through all HTML elements
				for(var i = 0; i < tmp.length; ++i) {
					//Store individual elements
					var t = tmp[i];
					//Store individual element
					e.push(t);
				}
			}
			//Return elements
			return e;
		}
	},
	external: {
		ns: {
			svg: "http://www.w3.org/2000/svg"
		}
	},
	file: {
		/* ======= Load file at path asynchronously =======
			 - Author: Ben Skinner
			 - Params: 
			 	- path (string of file path)
			 	- callback (function to be run on file load success, contents passed as param)
			 	- data (optional data pointer for extra information in callback)
		*/
		load: function(path, callback, data) {
			//Contents of the file to be loaded
			var contents = "";

			//XMLHttp Request for file at path
			var xmlhttp = new XMLHttpRequest();

			//Callback when file is loaded
			xmlhttp.onreadystatechange = function() { 
				if(xmlhttp.status == 200 && xmlhttp.readyState == 4) {
					//Set contents to response text
					contents = xmlhttp.responseText;

					//Call callback function with contents of file as param
					callback(contents, data);
				}
			};

			//Specify file and HTTP method
			xmlhttp.open("GET", path, true);

			//Send request
			xmlhttp.send();
		},
		/* ======= Load files at paths asynchronously =======
			 - Author: Ben Skinner
			 - Params: 
			 	- paths (array of strings to file paths)
			 	- callback (function to be run on all files loaded successfully, array of contents in same order as paths)
				- data (optional data pointer for extra information in callback)
		*/
		loadMultiple: function(paths, callback, data) {
			//Store number of files
			var numFiles = paths.length;

			//Counter for number of successful loads
			var filesLoaded = 0;

			//Array of all contents loaded
			var fileContents = [];

			//Load all files, include iteration in data for callback
			for(var i = 0; i < numFiles; ++i) {
				var curPath = paths[i];
				//var c = i;
				this.load(curPath, function(contents, d) {
					//Increment number of files loaded
					filesLoaded++;

					//Current iteration in callback
					var it = d.iteration;

					//Store loaded contents in consolidated array
					fileContents[it] = contents;

					//If this is the last to load, call final callback
					if(filesLoaded == numFiles) {
						//This is the last to be loaded, call final callback, pass array with contents in same order as paths
						callback(fileContents, data);
					}
				}, {iteration: i});
			}
		},
	},
	input: {
		/* ======= Add keybind =======
			 - Author: Ben Skinner
			 - Params: 
			 	- key 		(string of key)
				- mods		(object with properties: ctrl | shift | alt)
				- callback	(function to bind)
			 - Detail: 
				- Binds callback to key with modifiers
		*/
		keybind: function(key, callback, mods) {
			document.addEventListener("keydown", function(e) {
				var k = key.toUpperCase().charCodeAt(0);

				function mget(prop) { if(mods === null || mods === undefined) return false; return (mods[prop] !== undefined) ? true : false; }

				if(k === e.keyCode) {

					if(	e.ctrlKey 	===  mget("ctrl")  && 
						e.shiftKey 	===  mget("shift") && 
						e.altKey 	===  mget("alt") ){
						callback(e);
					}
				}
			})
		}
	},
	string: {
		/* ======= Combine strings with options =======
			 - Author: Ben Skinner
			 - Params: 
			 	- strings (array of strings to combine)
			 	- affixes (object with optional affixes)
			 - Detail: 
			 	- Infixes are applied to middle combinations
		*/
		combine: function(strings, affixes) {
			//Create final string storage
			var combinedString = "";

			//Loop through strings and store
			for(var i = 0; i < strings.length; ++i) {
				//Create temp copy of current string
				var curString = strings[i];

				//Try and add prefix
				if(affixes !== undefined && affixes.prefix !== "" && affixes.prefix !== undefined)
					combinedString += affixes.prefix;

				//Append to end of combined string
				combinedString += curString;

				//Try and add infix
				if(affixes !== undefined && affixes.infix !== "" && affixes.infix !== undefined)
					if(i < strings.length - 1)
						combinedString += affixes.infix;

				//Try and add suffix
				if(affixes !== undefined && affixes.suffix !== "" && affixes.suffix !== undefined)
					combinedString += affixes.suffix;
			}

			//Return combined string
			return combinedString
		}
	}
}

/* -------- External Helper Functions -------- */

/* ======= Is Value Valid =======
	 - Author: Ben Skinner
	 - Params: 
	 	- val (value to check)
	 - Return: 
	 	- bool whether value is valid
*/
wutils.isValid = function(value) { return (value === undefined || value === null) ? false : true; };

/* --------------- Wutils Info --------------- */
wutils.version = "0.1.0";
wutils.author = "Ben Skinner";