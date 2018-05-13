let mobile = true;
let classifier;
let net;

let Module = {
	locateFile: function(name){
		//console.log("worker: locateFile");
		let files = { "opencv_js.wasm": "opencv_js.wasm" }
		self.postMessage({ type: "locateFile" });
		return files[name]
	},
	preRun: function(){
		//console.log("worker: preRun");
		if(mobile){
			Module.FS_createPreloadedFile("/", "face", "model/haarcascade_frontalface_default.xml", true, false);
		}else{
			Module.FS_createPreloadedFile("/", "proto", "model/face_detector.prototxt", true, false);
			Module.FS_createPreloadedFile("/", "model", "model/face_detector.caffemodel", true, false);
		}
		self.postMessage({ type: "preRun" });
	},
	postRun: function(){
		//console.log("worker: postRun");
		if(mobile){
			classifier = new cv.CascadeClassifier();
			classifier.load("face");
		}else{
			net = cv.readNetFromCaffe("proto", "model");
		}
		self.postMessage({ type: "postRun" });
	}
};

self.importScripts("opencv.js");
self.addEventListener("message", (msg) =>{
	switch(msg.data.type){
	case "detect": {
		//console.log("worker: detect");
		let buffer = msg.data.buf;
		let width = msg.data.width;
		let height = msg.data.height;
		let img = new cv.Mat(height, width, cv.CV_8UC4);
		img.data.set(new Uint8Array(buffer));
		let faces = [];

		if(mobile){
			//console.log("worker: mobile");
			cv.cvtColor(img, img, cv.COLOR_RGBA2GRAY);
			let rect = new cv.RectVector();

			classifier.detectMultiScale(img, rect, 1.1, 3, 0);
			for(let i = 0; i < rect.size(); i++){ faces.push(rect.get(i)); }

			rect.delete();
		}else{
			//console.log("worker: desktop");
			cv.cvtColor(img, img, cv.COLOR_RGBA2BGR);
			let size = { width: width, height: height };
			//https://github.com/opencv/opencv/tree/master/samples/dnn
			//To achieve the best accuracy run the model on BGR images resized to 300x300 
			//applying mean subtraction of values (104, 177, 123) for each blue, green and red channels correspondingly.
			let mean = [104, 177, 123, 0];
			let blob = cv.blobFromImage(img, 1, size, mean, false, false);
			net.setInput(blob);
			let rect = net.forward();

			for(let i = 0, n = rect.data32F.length; i < n; i += 7){
				let confidence = rect.data32F[i + 2];
				let left = rect.data32F[i + 3] * img.cols;
				let top = rect.data32F[i + 4] * img.rows;
				let right = rect.data32F[i + 5] * img.cols;
				let bottom = rect.data32F[i + 6] * img.rows;
				left = Math.min(Math.max(0, left), img.cols - 1);
				right = Math.min(Math.max(0, right), img.cols - 1);
				bottom = Math.min(Math.max(0, bottom), img.rows - 1);
				top = Math.min(Math.max(0, top), img.rows - 1);
				if(confidence > 0.5 && left < right && top < bottom){
					faces.push({x: left, y: top, width: right - left, height: bottom - top})
				}
			}

			rect.delete();
			blob.delete();
		}

		self.postMessage({ type: "detect", faces: faces });
		img.delete();
		break;
	}
	}
});

