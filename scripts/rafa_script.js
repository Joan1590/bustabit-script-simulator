var config = {	
};
////
var apuesta=1.4;
var cashOut=1.7;
var apostar=false
var ultimoJuego=0;
var pjS=[]
var besebet=1
var net=0
var juegos=0
var colchon=100
var pos=0
////
var contador = 
[
	{"payout":1.01,"winners":200,"losses":4,"contWinners":0,"contLosses":0,"promedio":0},
	{"payout":1.1,"winners":100,"losses":5,"contWinners":0,"contLosses":0,"promedio":0},
	{"payout":1.2,"winners":100,"losses":5,"contWinners":0,"contLosses":0,"promedio":0},
	{"payout":1.3,"winners":100,"losses":5,"contWinners":0,"contLosses":0,"promedio":0},
	{"payout":1.4,"winners":100,"losses":5,"contWinners":0,"contLosses":0,"promedio":0},
	{"payout":1.5,"winners":100,"losses":5,"contWinners":0,"contLosses":0,"promedio":0},
	{"payout":2.0,"winners":100,"losses":5,"contWinners":0,"contLosses":0,"promedio":0},//6
	{"payout":10.5,"winners":100,"losses":5,"contWinners":0,"contLosses":0,"promedio":0},//7
	{"payout":50.5,"winners":100,"losses":5,"contWinners":0,"contLosses":0,"promedio":0},//8
	{"payout":100.5,"winners":100,"losses":5,"contWinners":0,"contLosses":0,"promedio":0},//9
];
var PajaritoMG=function(valores)
{	
	this.piso=0
	this.apuesta=valores[this.piso][0]
	this.cashOut=valores[this.piso][1]
	this.MaxJuegos=valores[this.piso][3]
	this.activo=false
	this.juegoMax=1
	this.juegos=0
	this.buenas=0
	this.calcularJugada=function(ultimoJuegoA)
	{
		if(this.activo)
		{	
			this.juegos++
			if(ultimoJuegoA<this.cashOut)
			{
				this.piso++
				this.buenas=0
				if(this.piso>valores.length-1)this.piso=0
				
			}else	
				{
					this.buenas++
					if(this.buenas==valores[this.piso][2])
					{	
						this.piso=0
						this.buenas=0
						//this.activo=false
					}
				}
		}
		
		
		this.apuesta=valores[this.piso][0]
		this.cashOut=valores[this.piso][1]
		
	}
}
var pjA;
/////
//////////////Pajaritos//////////////////
//////////////[apuesta,payout,cuotas para pagar,repetir si gana]//////

var pj0=new PajaritoMG([[1,1.1,1,1],[3,1.1,3,1],[10,1.1,4,1],[30,1.1,4,1],[100,1.1,5,1],[500,1.1,2,1],[6000,1.1,1,1]])
pjS.push(pj0)
var pj1=new PajaritoMG([[1,1.5,1,1],[7,1.1,2,1],[30,1.1,2,1],[30,1.1,4,1],[100,1.1,5,1],[500,1.1,2,1],[6000,1.1,1,1]])
pjS.push(pj1)

///////////////////
/////////////////////
////
pjA=pj0;
engine.on('GAME_STARTING', onGameStarted);
engine.on('GAME_ENDED', onGameEnded);
function updateValues(bust)
{	
	for (var i = 0; i < contador.length; i++) {
		if (bust>=contador[i].payout) {
			contador[i].contWinners++;
			contador[i].contLosses=0;
		}else{
			contador[i].contLosses++;
			contador[i].contWinners=0;
		}
	}
	///////////
	
	

}
//////////////
var pos=0
function calcularJugada(ultimoJuegoA) 
{
	
		
		if(pjA.activo)
		{			
			pjA.calcularJugada(ultimoJuegoA)
			if(pjA.juegos>pjA.MaxJuegos&&pjA.piso==0)
			{	
				pjA.juegos=0
				pjA.activo=false
			}
			
		}else
		{
			
			var r=Math.floor(Math.random()*10)	
			
			////////////////Reglas/////////	
			////////////////
			if(contador[1].contLosses==1)
			{	
					if(r>0.5)
					{	pjA=pjS[0];					
						pjA.activo=true
						pjA.piso=0
					}else{	pjA=pjS[1];					
						pjA.activo=true
						pjA.piso=0
					}
			}
			
			////////////////////
			////////////////////
		
		}
		
	
}
/////////////////////////
function onGameStarted() 
{
	calcularJugada(ultimoJuego) 
	
	if(pjA.activo)
	{
		engine.bet(roundBit(pjA.apuesta*100*besebet), pjA.cashOut);	
	}
	else{}		
}
/////////////
function onGameEnded() 
{
	juegos++
	
	var lastGame = engine.history.first()
	ultimoJuego=lastGame.bust
	
	if(pjA.activo)
	{ 
		if(ultimoJuego>pjA.cashOut)
			{ 
				net+=Math.round(100*(pjA.cashOut-1)*roundBit(pjA.apuesta*100*besebet)/100)
			}else{ 
				net-=Math.round(roundBit(pjA.apuesta*100*besebet)/100)
				}
	}
	/*if(net>120)
	{
		net=0
		besebet++
	}*/
	updateValues(ultimoJuego)	
}
/////

//////
function roundBit(bet) 
{
  return Math.round(bet / 100) * 100;
}