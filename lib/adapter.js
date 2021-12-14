var adapter = {};


window.ethereum.send('eth_requestAccounts').then((response)=>{
	let buf = location.search.split('/');
	let network = parseInt(buf[1]) || Network;
	let addr = buf[2] || ContractAddrs[network];
	let tokenId = buf[3] || 0;
	
	if(network.toString() != window.ethereum.networkVersion) {
		alert(`Network error: Please connect to Network(${network}), then refresh the page.`);
	}
	
	adapter.accounts = response.result;
	adapter.provider = new ethers.providers.Web3Provider(window.ethereum, network);
	adapter.contract = new ethers.Contract(addr, ContractABI, adapter.provider.getSigner());
	
	onAdapterLoad(tokenId);
});

adapter.getMap = async (mapId)=>{
	let map = {};

	let tokenURI = await adapter.contract.tokenURI(mapId);
	if(!tokenURI) return null;

	let response = await fetch(tokenURI);
	let metadata = await response.json();
	map.image = metadata.image;
	
	let size = await adapter.contract.getMapSize(mapId);
	map.width = size[0];
	map.height = size[1];
	
	return map;
}

adapter.listPixels = async (mapId)=>{
	let response = await adapter.contract.listPixels(mapId, {gasLimit:80000000});
	let result = [];
	for(let x=0;x<response.length;++x) {
		result[x] = [];
		for(let y=0;y<response[x].length;++y) {
			let pixel = response[x][y];
			result[x][y] = {
				owner: pixel.owner,
				value: pixel.value,
				cost: pixel.cost.toBigInt(),
			};
			result[x][y].costInNEth = result[x][y].cost / 1000000000n;
		}
	}
	
	return result;
}

adapter.putPixels = async (mapId, packed, feeInNEth)=>{
	await adapter.contract.putPixels(mapId, packed, {value:feeInNEth*1000000000n});
}
