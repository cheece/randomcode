extends Spatial
#this script shows how to do procedural audio generation in godotengine
var wave_freq = 440; #LA

var voic #voice
var sampl #sample

func _ready():
	var freq = 44100 # sample rate, 
	var dur = 2.0 #audio duration
	
	self.voic = AudioServer.voice_create(); #create our voice
	var alength = int(dur*freq); #total sample count
	
	self.sampl = AudioServer.sample_create(AudioServer.SAMPLE_FORMAT_PCM8,false,alength);
	
	var o = RawArray([]);
	
	for i in range(alength):
		var t = i/float(freq); #time of the sample
		var v = int(sin(t*wave_freq*PI)*128); #sine wave sample
		o.append(v);
		
	AudioServer.sample_set_data(self.sampl,o);	
	AudioServer.voice_play(self.voic,self.sampl);
	