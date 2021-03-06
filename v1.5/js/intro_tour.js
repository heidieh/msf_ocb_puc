/*************************/
/****  INTRO.JS TOUR  ****/
/*************************/

function helpTour() {
    var intro = introJs();
    $('#btnIntro').addClass('on');
    intro.setOptions({
		steps: [
		    {
			    intro:"<div><p style='font-size:14px'><b>MSF OCB Pool d'Urgence Congo Dashboard</b></p><p>Ce dashboard affiche les données épidémiologiques pour les pathologies surveillées par le Pool Urgence Congo (PUC) de MSF. Les données peuvent être explorées par pathologie, Province ou Zone de Santé et selon un certain intervalle de temps.</p><p>Ce tour vous fera découvrir les principales caractéristiques du site et vous expliquera comment interagir avec celui-ci afin de visualiser les données qui vous intéressent.</p></div>",
			    tooltipClass: 'intro-tooltip'
		    },
		    {
		    	element: '#mySideMenu',
			    intro:"<div><p style='font-size:14px'><b>Le Menu</b></p><p>Le Menu contient des options pour sélectionner des données spécifiques, ainsi que des résumés de la sélection en cours.</p><p>Les options pour sélectionner les données incluent:</p><ul><li style='margin-bottom: 5px;'><b>Pathologie:</b> la pathologie est sélectionnée dans la liste déroulante</li><li style='margin-bottom: 5px;'><b>Statistique:</b> la statistique (<i>Nombre de Cas</i> ou <i>Létalité</i>) est sélectionnée dans la liste déroulante</li><li style='margin-bottom: 5px;'><b>Réinitialiser:</b> Ce bouton resélectionne toutes les régions (provinces ou zones), et resélectionne l’intervalle de temps par défaut (les 3 derniers mois épidémiologiques). La pathologie et la statistique actuelles ne sont pas modifiées.</li></ul><p>Résumé des données actuelles sélectionnées:</p><ul><li style='margin-bottom: 5px;'><b>Total indiqué sur la carte:</b> Affiche la statistique calculée pour la pathologie actuelle, pour la période actuelle sélectionnée et pour toutes les régions actuelles (provinces ou zones) sélectionnées.</li><li style='margin-bottom: 5px;'><b>Montre options choisies:</b> Ce bouton ouvre et ferme une fenêtre affichant un <i>Résumé des options choisies</i>. Cela comprend la pathologie, la statistique, les semaines épidémiologiques et leurs dates, ainsi que les régions (provinces ou zones) sélectionnées.</li></ul></div>",
		    	position: 'right',
		    	tooltipClass: 'intro-tooltip'
		    },{
		    	element: '#map-container',
			  	intro: "<div><p style='font-size:14px'><b>La Carte</b></p><p>La carte affiche les valeurs de la statistique et de la pathologie en cours (qui sont toutes deux sélectionnées dans le <i>Menu</i>) et pour la période de temps sélectionnée (sélectionnée dans le deuxième histogramme ci-dessous - expliqué à l'étape suivante). Le titre de la carte (en haut à gauche) change pour refléter la statistique actuelle et la pathologie affichée.</p></div>",
			  	position: 'bottom',
			  	tooltipClass: 'intro-map'
		    },
		    {
		    	element: '#map-container',
			  	intro: "<div><p style='font-size:14px'><b>La Carte</b> - <i>Les options pour interagir avec la carte</i></p><ul><li style='margin-bottom: 5px;'>Pour basculer l'affichage de la carte entre les <i>Provinces</i> et les <i>Zones de Santé</i>, sélectionnez le bouton approprié en haut à droite de la carte.</li><li style='margin-bottom: 5px;'>Pour afficher la statistique actuelle pour une région spécifique (Province ou Zone de Santé), passez la souris dessus. Une boîte d'information apparaîtra dans le coin supérieur droit de la carte.</li><li style='margin-bottom: 5px;'>Pour sélectionner une région spécifique (Province ou Zone de Santé), cliquez dessus. Pour le désélectionner, cliquez dessus une seconde fois. Il est possible de sélectionner plusieurs régions en même temps. La sélection actuelle des régions est résumée dans la fenêtre <i>Montre options choisies</i>.</li><li style='margin-bottom: 5px;'>Pour ajouter ou supprimer des rivières de la carte, activez ou désactivez le bouton <i>Rivières</i>.</li></ul></div>",
			  	position: 'bottom',
			  	tooltipClass: 'intro-map'
		    },
		    {
		    	element: '#timeseries-container',
			    intro:"<div><p style='font-size:14px'><b>Les Histogrammes</b></p><p>Le premier histogramme affiche à la fois le <i>Nombre de Cas</i> (en barres) et la <i>Létalité</i> (en tant que ligne) pour la pathologie sélectionnée dans le <i>Menu</i> et les régions (Provinces ou Zones de Santé) sélectionnées sur la carte. En survolant une barre affiche les statistiques pour cette semaine épidémiologique.</p><p>Le deuxième histogramme peut être utilisé pour sélectionner une période de temps. Cela met à jour la période affichée dans le premier histogramme (l'axe des x) et les statistiques affichées sur la carte. La période de temps sélectionnée est résumée dans le <i>Montre options choisies</i> du <i>Menu</i>. La période peut être sélectionnée de la manière suivante:</p><ul><li style='margin-bottom: 5px;'>Passez la souris sur le deuxième histogramme. Lorsque le réticule apparaît, cliquez et glissez sur les barres pour sélectionner.</li><li style='margin-bottom: 5px;'>Cliquez et faites glisser l'une des poignées (à gauche ou à droite de l’intervalle de temps sélectionnée).</li><li style='margin-bottom: 5px;'>Cliquez sur l'un des boutons à droite des histogrammes pour sélectionner une intervalle de temps prédéfinie.</li><li style='margin-bottom: 5px;'>Pour sélectionner tout le temps disponible (toutes les barres), tirez les poignées vers les limites extérieures de l'histogramme ou cliquez quelque part sur l'histogramme mais en dehors de la sélection actuelle.</li></ul></div>",
		    	position: 'top',
		    	tooltipClass: 'intro-timeseries'
		    },{
		    	element: '#play-container',
			    intro:"<div><p style='font-size:14px'><b>Jouer à l'animation</b></p><p>Ici, il est possible de <i>jouer</i> et mettre en <i>pause</i> une animation de la carte à travers le temps.</p><ul><li style='margin-bottom: 5px;'>Appuyez sur le bouton <i>Lecture</i> pour regarder la carte pendant chaque semaine épidémiologique de la sélection en cours (c'est-à-dire chaque semaine affichée dans le premier histogramme).</li><li style='margin-bottom: 5px;'>Appuyez sur le bouton <i>Pause</i> pour mettre en pause la fonction de lecture et afficher la carte pour la semaine épidémiologique actuellement sélectionnée uniquement. Notez qu'en mode <i>Pause</i>, il n'est pas possible d'interagir avec le dashboard / tableau de bord pour modifier la sélection de données actuelle (par exemple, il est possible d'activer ou de désactiver le bouton <i>Rivières</i>, mais il n'est pas possible de modifier la pathologie sélectionnée).</li><li style='margin-bottom: 5px;'>Appuyez sur le bouton <i>Stop</i> pour quitter le mode de lecture et revenir à l'interaction complète du dashboard / tableau de bord.</li></ul></div>",
		    	position: 'right',
		    	tooltipClass: 'intro-tooltip'
		    },
		    /*{
			  intro:"<div><p style='font-size:14px'><b>Plus d'informations:</b></p><ul><li style='margin-bottom: 5px;'>Le projet Pool d'Urgence Congo est mis en œuvre par MSF OCB ...</li><li style='margin-bottom: 5px;'>Il est soutenu par ...</li><li style='margin-bottom: 5px;'>Le dashboard / tableau de bord a été développé en 2017 pour soutenir ....</li><li style='margin-bottom: 5px;'>Toutes les données sont ...</li></ul></div>",
			  tooltipClass: 'intro-tooltip'
		    }*/
 		]
	});
    intro.start();
    /*intro.onbeforeexit(function() {
	    //addHints();
	});
	intro.onchange(function(targetElement) {
	});*/
    intro.onexit(function() {
	    $('#btnIntro').removeClass('on');
	});
};

var hints = [
          /*{
            element: document.querySelector('#disease-select'),
            hint: "This is a tooltip.",
            hintPosition: 'top-middle'
          }, */
          {
            element: '#map-container',
            hint: 'More features, more fun.',
            position: 'left'
          },
          {
            element: '#btnRiv',
            hint: "<b>Another</b> step.",
            hintPosition: 'top-middle'
          }
        ];
     
function addHints(){
    intro = introJs();
      intro.setOptions({
        hints: hints
      });
      intro.onhintsadded(function() {
          console.log('all hints added: ', hints);
          intro.setOptions({hints: hints});
      });
      intro.onhintclick(function(hintElement, item, stepId) {
          console.log('hint clicked', hintElement, item, stepId);
      });
      intro.onhintclose(function (stepId) {
          console.log('hint closed', stepId);
          console.log(document.querySelectorAll('.introjs-hidehint').length, hints.length)
		  if (document.querySelectorAll('.introjs-hidehint').length === hints.length) {
		  	$('#btnIntro').removeClass('on');
		  	console.log("reset hints now")
		    intro.setOptions({hints: hints}) 
		  } 
      });
      intro.addHints();
  }

function removeHints() {
	console.log('all hints removed');
	introJs().hideHints();
	introJs().refresh();
	//intro = introJs();
	//intro.setOptions({hints: hints});
}
