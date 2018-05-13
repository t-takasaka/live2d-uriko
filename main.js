let body = document.createElement("body")
let webcam = document.getElementById("webcam");
let input = document.createElement("canvas");
let inputCtx = input.getContext("2d");
let output = document.getElementById("canvas");
let outputCtx = output.getContext('2d');
let message = document.getElementById("message");
let width, height;
let webcam_long_side = 128;

let motion_normal = 5;
let motion_greet = 0;

stats = new Stats();
stats.showPanel(0);
stats.dom.style.display = "none";
document.body.appendChild(stats.dom);

let model = null;
let app = new PIXI.Application(0, 0, { transparent: true });
app.view.style.display = "none";
document.body.insertBefore(app.view, message);

let xhrType = { xhrType: PIXI.loaders.Resource.XHR_RESPONSE_TYPE.JSON };
let loader = new PIXI.loaders.Loader();
loader.add('model3', "assets/Koharu/Koharu.model3.json", xhrType);
loader.add('motion', "assets/Koharu/Koharu.motion3.json", xhrType);
loader.add('motion1', "assets/Koharu/Koharu_01.motion3.json", xhrType);
loader.add('motion2', "assets/Koharu/Koharu_02.motion3.json", xhrType);
loader.add('motion3', "assets/Koharu/Koharu_03.motion3.json", xhrType);
loader.add('motion4', "assets/Koharu/Koharu_04.motion3.json", xhrType);
loader.add('motion5', "assets/Koharu/Koharu_05.motion3.json", xhrType);
loader.add('motion6', "assets/Koharu/Koharu_06.motion3.json", xhrType);
loader.add('motion7', "assets/Koharu/Koharu_07.motion3.json", xhrType);
loader.add('motion8', "assets/Koharu/Koharu_08.motion3.json", xhrType);
loader.add('motion9', "assets/Koharu/Koharu_09.motion3.json", xhrType);
loader.load(function (loader, resources){
	let builder = new LIVE2DCUBISMPIXI.ModelBuilder();
	builder.buildFromModel3Json(loader, resources['model3'], function(m){
		model = m;

		//基本モーション
		let motions = [];
		let animation = LIVE2DCUBISMFRAMEWORK.Animation;
		let override = LIVE2DCUBISMFRAMEWORK.BuiltinAnimationBlenders.OVERRIDE;
		motions.push(animation.fromMotion3Json(resources['motion2'].data));
		motions.push(animation.fromMotion3Json(resources['motion3'].data));
		motions.push(animation.fromMotion3Json(resources['motion4'].data));
		motions.push(animation.fromMotion3Json(resources['motion5'].data));
		motions.push(animation.fromMotion3Json(resources['motion6'].data));
		motions.push(animation.fromMotion3Json(resources['motion7'].data));
		motions.push(animation.fromMotion3Json(resources['motion8'].data));
		motions.push(animation.fromMotion3Json(resources['motion9'].data));
		model.motions = motions;
		model.animator.addLayer("motion", override, 1);
		//通常モーション
		let motion = model.animator.getLayer("motion");
		motion.play(model.motions[motion_normal]);//5->4
		motion.type = motion_normal;

		//挨拶モーション
		let data = resources['motion1'].data;
		model.greet_motion = animation.fromMotion3Json(data);

		//視線追従モーション
		data.CurveCount = data.TotalPointCount = data.TotalSegmentCount = 0;
		data.Curves = [];
		let gaze_motion = animation.fromMotion3Json(data);
		model.animator.addLayer("gaze", override, 1);
		model.animator.getLayer("gaze").play(gaze_motion);

		//視線追従モーションのパラメータ値更新
		model.gazeX = 0;
		model.gazeY = 0;
		let ids = model.parameters.ids;
		let angle_x = Math.max(ids.indexOf("ParamAngleX"), ids.indexOf("PARAM_ANGLE_X"));
		let angle_y = Math.max(ids.indexOf("ParamAngleY"), ids.indexOf("PARAM_ANGLE_Y"));
		let eye_x = Math.max(ids.indexOf("ParamEyeBallX"), ids.indexOf("PARAM_EYE_BALL_X"));
		let eye_y = Math.max(ids.indexOf("ParamEyeBallY"), ids.indexOf("PARAM_EYE_BALL_Y"));
		gaze_motion.evaluate = (time, weight, blend, target, stackFlags, groups) => {
			let values = target.parameters.values;
			let max = target.parameters.maximumValues;
			let min = target.parameters.minimumValues;
			let angle_h = model.gazeX > 0 ? max[angle_x] : -min[angle_x];
			let angle_v = model.gazeY > 0 ? max[angle_y] : -min[angle_y];
			let eye_h = model.gazeX > 0 ? max[eye_x] : -min[eye_x];
			let eye_v = model.gazeY > 0 ? max[eye_y] : -min[eye_y];
			values[angle_x] = blend(values[angle_x], model.gazeX * angle_h, 0, weight);
			values[angle_y] = blend(values[angle_y], model.gazeY * angle_v, 0, weight);
			values[eye_x] = blend(values[eye_x], model.gazeX * eye_h, 0, weight);
			values[eye_y] = blend(values[eye_y], model.gazeY * eye_v, 0, weight);
		}

		app.stage.addChild(model);
		app.stage.addChild(model.masks);

		app.ticker.add(function (deltaTime) {
			model.update(deltaTime);
			model.masks.update(app.renderer);
		});

		resize();
	});
});

function init(){
	navigator.mediaDevices.getUserMedia({
		video: { facingMode: "user" },
		audio: false

	}).then(function(stream){
		webcam.srcObject = stream;
		webcam.play();
		resize();
	});
}
init();

function update(){
	stats.begin();
	inputCtx.drawImage(webcam, 0, 0, width, height);
	let buffer = inputCtx.getImageData(0, 0, width, height).data.buffer;

	worker.postMessage({ type: "detect", buf: buffer, width: width, height: height }, [buffer]); 
}

function resize(){
	let w = window.innerWidth;
	let h = window.innerHeight;
	if(window.innerWidth > window.innerHeight){
		width = webcam_long_side;
		height = Math.floor(webcam_long_side * h / w);
	}else{
		width = Math.floor(webcam_long_side * w / h);
		height = webcam_long_side;
	}
	webcam.width = input.width = output.width = width;
	webcam.height = input.height = output.height = height;

	if(!model){ return; }
	h = (w / 16.0) * 9.0;
	app.view.style.width = w + "px";
	app.view.style.height = h + "px";
	app.renderer.resize(w, h);
	model.position = new PIXI.Point((w * 0.5), (h * 0.5));
	model.scale = new PIXI.Point((model.position.x * 0.8), (model.position.x * 0.8));
	model.masks.resize(app.view.width, app.view.height);
}
window.onresize = resize;

const worker = new Worker("worker.js");
worker.addEventListener("message", (msg) => {
	switch(msg.data.type){
	case "locateFile": {
		//console.log("main: locateFile");
		message.innerText = "ロード中...";
		break;
	}
	case "preRun": {
		//console.log("main: preRun");
		message.innerText = "コンパイル中...";
		break;
	}
	case "postRun": {
		//console.log("main: postRun");
		message.innerText = "";
		stats.dom.style.display = "block";
		app.view.style.display = "block";
		requestAnimationFrame(update);
		break;
	}
	case "detect": {
		//console.log("main: detect");
		requestAnimationFrame(update);
		let faces = msg.data.faces;

		if(faces.length > 0){
			let max_width = 0;
			let gazeX = 0, gazeY = 0;
			for (let i = 0; i < faces.length; i++) {
				let face = faces[i];
				if(max_width < face.width){
					gazeX = face.x + face.width / 2;
					gazeY = face.y + face.height / 2;
					max_width = face.width;
				}
			}
			//-1～1のにマッピングしたのち、上下左右を反転
			model.gazeX = ((gazeX / width) - 0.5) * 2 * -1;
			model.gazeY = ((gazeY / height) - 0.5) * 2 * -1;

			//挨拶モーション再生
			let motion = model.animator.getLayer("motion");
			if(motion && model.greet_motion && motion.type != motion_greet){
				motion.stop();
				motion.play(model.greet_motion);
				motion.type = motion_greet;
			}
		}else{
			//通常モーション再生
			let motion = model.animator.getLayer("motion");
			if(motion && motion.currentTime >= motion.currentAnimation.duration){
				motion.stop();
				motion.play(model.motions[motion_normal]);
				motion.type = motion_normal;
			}
		}

		//チェック用
		let test = true;
		if(test){
			outputCtx.drawImage(webcam, 0, 0, width, height);
			outputCtx.strokeStyle = "rgba(255, 0, 0, 1)";
			outputCtx.lineWidth = 2;
			for (let i = 0; i < faces.length; i++) {
				let face = faces[i];
				outputCtx.strokeRect(face.x, face.y, face.width, face.height);
			}
		}
		stats.update();
		break;
	}
	}
});
