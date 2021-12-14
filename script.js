const colors = [
	'#000000', '#000080', '#008000', '#008080', '#800000', '#800080', '#808000', '#c0c0c0',
	'#808080', '#0000ff', '#00ff00', '#00ffff', '#ff0000', '#ff00ff', '#ffff00', '#ffffff',
];
let mapId = 0;

let mapNode = document.querySelector('#map');
let maskNode = document.querySelector('#mask');
let pointerNode = document.querySelector('#pointer');

let pixelDataNode = document.querySelector('#pixelData');

let ctx = maskNode.getContext('2d');

let dotSize = 10;
let w;
let h;
updateSize(48, 48);
let selectedColorIndex = 15;

let map;
let pixels;
let updatings;
let expectedCost = 0n;

function onAdapterLoad(tokenId) {
	mapId = tokenId || 0;
	adapter.getMap(mapId).then((response)=>{
		if(!response) return;
		
		map = response;
		
		updateSize(map.width, map.height);
		updatings = [];
		for(let x=0;x<map.width;++x) {
			updatings[x] = [];
			for(let y=0;y<map.height;++y) {
				updatings[x][y] = null;
			}
		}
		
		maskNode.style.backgroundImage = `url("${map.image}")`;
	});
	adapter.listPixels(mapId).then((response)=>{
		pixels = response;
	});
}

function updateSize(width, height) {
	w = width;
	h = height;
	
	mapNode.style.width = w + 'em';
	mapNode.style.height = h + 'em';

	maskNode.width = w*dotSize;
	maskNode.height = h*dotSize;
}

mapNode.style.fontSize = dotSize + 'px';

let mx = 0;
let my = 0;
let cx;
let cy;

mapNode.addEventListener('contextmenu', (ev)=>{
	ev.preventDefault();
});
maskNode.addEventListener('mousemove', (ev)=>{
	if(ev.srcElement != maskNode) return;
	
	mx = Math.floor(ev.offsetX / dotSize);
	if(mx >= w) mx = w-1;
	if(mx < 0) mx = 0;
	my = Math.floor(ev.offsetY / dotSize);
	if(my >= h) my = h-1;
	if(my < 0) my = 0;

	if(ev.buttons == 1) {
		paint(0);
	} else if(ev.buttons == 2) {
		paint(2);
	}
	onCoordChange();
});
pointerNode.addEventListener('mousedown', (ev)=>{
	paint(ev.button);
});

function onCoordChange() {
	pointerNode.style.transform = `translate(${mx-0.25}em, ${my-0.25}em)`;
	
	cx = mx;
	cy = h - my - 1;
	
	let pixel = pixels[cx][cy];
	let updating = updatings[cx][cy];
	
	pixelDataNode.setAttribute('isUpdating', updating ? 1 : 0);
	pixelDataNode.querySelector('.coord').textContent = `(${cx}, ${cy})`;
	
	pixelDataNode.querySelector('.cost').textContent = '↓ $ ' + `${pixel.costInNEth} NanoETH ↓`;
	
	pixelDataNode.querySelector('.current .color').style.backgroundColor = colors[pixel.value];
	pixelDataNode.querySelector('.current .owner').value = pixel.owner;
	
	if(updating) {
		pixelDataNode.querySelector('.next .color').style.backgroundColor = colors[updating.value];
		pixelDataNode.querySelector('.next .owner').value = 'You';
	} else {
		pixelDataNode.querySelector('.next .color').style.backgroundColor = 'transparent';
		pixelDataNode.querySelector('.next .owner').value = '';
	}
}

function paint(button) {
	let x = mx;
	let y = (h-my-1);
	
	if(button==0) {
		ctx.fillStyle = colors[selectedColorIndex];
		ctx.fillRect(x*dotSize, (h-y-1)*dotSize, dotSize, dotSize);
		
		if(updatings[x][y]) {
			expectedCost -= updatings[x][y].costInNEth;
		}
		expectedCost += pixels[x][y].costInNEth;
		
		updatings[x][y] = {
			value: selectedColorIndex,
			costInNEth: pixels[x][y].costInNEth,
		};
	} else if(button==2) {
		ctx.clearRect(x*dotSize, (h-y-1)*dotSize, dotSize, dotSize);
		
		if(updatings[x][y]) {
			expectedCost -= updatings[x][y].costInNEth;
		}
		
		updatings[x][y] = null;
	}
	
	document.querySelector('#expectedCost').textContent = expectedCost.toString() + ' NanoETH';
	document.querySelector('#suggestedCost').textContent = (expectedCost*2n).toString() + ' NanoETH';
	
	onCoordChange();
};



selectColor(selectedColorIndex);

function selectColor(i) {
	selectedColorIndex = i;
	document.querySelector('#selectedColor').style.background = colors[i];
	pointerNode.style.backgroundColor = colors[i];
	pointerNode.style.borderColor = colors[15-i];
}

let colorListNode = document.querySelector('#colorList');
colors.forEach((item, i)=>{
	let node = document.createElement('li');
	node.style.background = item;
	node.colorIndex = i;
	
	node.addEventListener('click', (ev)=>{
		selectColor(i);
	});
	
	colorListNode.appendChild(node);
});


document.querySelector('#submit').addEventListener('click', async (ev)=>{
	let packed = '0x';
	
	for(let x=0;x<w;++x) {
		for(let y=0;y<h;++y) {
			if(!updatings[x][y]) continue;
			if(updatings[x][y].value >= 16) continue;
			packed += x.toString(16).padStart(4,'0') + y.toString(16).padStart(4,'0') + '0' + updatings[x][y].value.toString(16);
		}
	}
	let checked = document.querySelector('input[name="payment"]:checked').value;
	
	let cost;
	if(checked == 'expected') {
		cost = expectedCost;
	} else if(checked == 'custom') {
		cost = BigInt(parseInt(document.querySelector('#custom').value) || 0);
	} else {
		cost = expectedCost*2n;
	}
	
	try {
		await adapter.putPixels(mapId, packed, cost);
	} catch(err) {
		console.error(err);
		alert(err);
	}
});
document.querySelector('#reset').addEventListener('click', (ev)=>{
	ctx.clearRect(0, 0, w*dotSize, h*dotSize);
	for(let x=0;x<w;++x) {
		for(let y=0;y<h;++y) {
			updatings[x][y] = null;
		}
	}
	
	expectedCost = 0n;
	document.querySelector('#expectedCost').textContent = '0 NanoETH';
	document.querySelector('#suggestedCost').textContent = '0 NanoETH';
});
