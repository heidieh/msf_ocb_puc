/*************************/
/****  INTRO.JS TOUR  ****/
/*************************/

function helpTour() {
    var intro = introJs();
    $('#btnIntro').addClass('on');
    intro.setOptions({
		steps: [
		    {
			    intro: "<div><p style='font-size:14px'><b>MSF OCB Pool d'Urgence Congo Dashboard v2.2</b></p><p>Ce dashboard affiche les données épidémiologiques et leurs activités associées pour les pathologies surveillées par le Pool d'Urgence Congo (PUC) de MSF.</p><p>Les données peuvent être explorées par pathologie, Province ou Zone de Santé et selon un certain intervalle de temps. Les activités peuvent être affichées par type <i>(Alertes, Evaluations, Interventions).</i></p><p>Ce tour vous fera découvrir les principales caractéristiques du site et vous expliquera comment interagir avec celui-ci afin de visualiser les données et activités qui vous intéressent.</p></div>",
			    tooltipClass: 'intro-wide'
		    },
		    {
		    	element: '#sideMenu',
				intro:"<div><p style='font-size:14px'><b>Le Menu (1 sur 3)</b></p><p>Le Menu contient des options pour sélectionner des données et des activités spécifiques, ainsi que pour le réinitialiser et de télécharger son état actuel.</p><p>Les options pour sélectionner les données et les activités incluent:</p><ul><li style='margin-bottom: 5px;'><b>Pathologie:</b> la pathologie est sélectionnée dans la liste déroulante</li><li style='margin-bottom: 5px;'><b>Statistique:</b> la statistique (<i>Nombre de Cas</i> ou <i>Létalité</i>) est sélectionnée dans la liste déroulante</li><li style='margin-bottom: 5px;'><b>Activités:</b> les activités (<i>Alertes (alarme, focus, suivi actif, fermé), Evaluations,</i> et <i>Interventions</i>) peuvent être activées ou désactivées par les boutons</li><li style='margin-bottom: 5px;'><b>Régions (Provinces ou Zones):</b> les régions peuvent être sélectionnées comme suit:<ul><li style='margin-top: 3px;'>Cliquez dans la zone de saisie <i>‘Sélectionnez région(s)’</i> et sélectionnez la région dans la liste déroulante</li><li style='margin-top: 3px;'>Tapez le nom, ou une partie du nom, directement dans la zone de saisie</li><li style='margin-top: 3px;'>Les régions peuvent être désélectionnées en cliquant sur le <i>‘x’</i> par leur nom ou en les supprimant.</li></ul><p style='margin-top: 2px;'>Normalement, une seule région est sélectionnée à la fois. Pour ajouter plusieurs régions en même temps, maintenez la touche <i>‘SHIFT’</i> enfoncée tout en sélectionnant la région.</p></ul></div>",
				position: 'right',
		    	tooltipClass: 'intro-wide'
		    },{
		    	element: '#sideMenu',
				intro:"<div><p style='font-size:14px'><b>Le Menu (2 sur 3)</b></p><p>Le Menu contient des options pour sélectionner des données et des activités spécifiques, ainsi que pour le réinitialiser et de télécharger son état actuel.</p><p>Les options pour réinitialiser incluent:</p><ul><li style='margin-bottom: 5px;'><b>Réinitialiser la Carte:</b> Ce bouton resélectionne toutes les provinces, et effectue un zoom sur tout le RDC. La pathologie et la statistique actuelles ne sont pas modifiées, ni l’intervalle de temps.</li><li style='margin-bottom: 5px;'><b>Réinitialiser Tout:</b> Ce bouton resélectionne toutes les provinces, et effectue un zoom sur tout le RDC. Il resélectionne aussi la pathologie, la statistique et l’intervalle de temps par défaut.</li></li></ul></ul></div>",
				position: 'right',
		    	tooltipClass: 'intro-wide'
		    },{
		    	element: '#sideMenu',
				intro:"<div><p style='font-size:14px'><b>Le Menu (3 sur 3)</b></p><p>Le Menu contient des options pour sélectionner des données et des activités spécifiques, ainsi que pour le réinitialiser et de télécharger son état actuel.</p><p>Pour exporter l’état actuel du dashboard, cliquez sur le bouton <i>’Export Dashboard’</i>. Un dossier compressé contenant les fichiers suivants est téléchargé:</p><ul><li>Un <b>rapport PDF</b> sur l'état actuel du dashboard</li><li><b>Fichiers image (.png)</b> de: la carte du dashboard, une carte sitrep, et l'histogramme</li><li><b>Fichiers KML</b> pour: les régions, les activités (y compris les icônes d'activité), les lacs, et les rivières</li><li><b>Fichiers CSV</b> pour: les données cartographiques actuelles, et les données de l'histogramme actuelles</li><li><b>Fichiers texte</b> résumant: les options et les activités choisis, et les alertes spécifiques à la carte sitrep</li></ul></div>",
				position: 'right',
		    	tooltipClass: 'intro-wide'
		    },{
		    	element: '#filter-summary',
			    intro: "<div><p style='font-size:14px'><b>Résumé des données actuelles sélectionnées</b></p><p>Cela donne un résumé de toutes les options actuellement choisies. Ceux-ci sont:</p><ul><li style='margin-bottom: 5px;'><b>Pathologie et statistique, et le total</b> (nombre ou pourcentage) calculée pour la sélection en cours</li><li style='margin-bottom: 5px;'><b>Semaines-epi</b>, par numéro de semaine et par date</li><li style='margin-bottom: 5px;'><b>Activités</b></li><li style='margin-bottom: 5px;'><b>Régions</b> (provinces ou zones)</li></ul></div></p></div>",
			    position: 'bottom',
		    	tooltipClass: 'intro-narrow'
		    },{
		    	element: '#map',
			  	intro: "<div><p style='font-size:14px'><b>La Carte</b></p><p>La carte affiche les valeurs de la statistique pour la pathologie en cours et l’intervalle de temps sélectionnée, pour toutes les régions sélectionnée. La carte peut afficher aussi les activités pour cette sélection. Le résumé (en haut) change pour refléter ces sélections.</p><p>Interagissez avec la carte dans les manières suivantes:</p><ul><li style='margin: 10px 0px;'><b>Afficher la statistique actuelle pour une région spécifique (Province ou Zone de Santé)</b>: Passez la souris dessus sur la carte. Une boîte d'information apparaîtra dans le coin supérieur droit de la carte.</li><li style='margin: 10px 0px;'><b>Changer les couches affichées sur la carte (vers le <i>Menu</i>)</b><ul><li style='margin-bottom: 3px;'>Pour basculer l'affichage de la carte entre les <i>Provinces</i> et les <i>Zones de Santé</i>, sélectionnez le bouton approprié dans le <i>Menu</i>.</li><li style='margin-bottom: 3px;'>Pour ajouter ou supprimer l'affichage de chaque type d’activité, sélectionnez le bouton approprié dans le <i>Menu</i>.</li><li style='margin-bottom: 3px;'>Pour ajouter ou supprimer les rivières de la carte, activez ou désactivez le bouton <i>Rivières</i> dans le <i>Menu</i>.</li></ul></li><li style='margin: 10px 0px;'><b>Pour sélectionner des régions:</b><ul><li style='margin-bottom: 5px;'>Pour sélectionner une région spécifique (que ce soit une province ou une zone de santé), cliquez dessus. Pour le désélectionner, cliquez dessus une seconde fois. Cela va le désélectionner et re-sélectionner toutes les régions.</li><li style='margin-bottom: 5px;'>Pour sélectionner plusieurs régions en même temps, maintenez la touche <i>‘SHIFT’</i> enfoncée tout en sélectionnant les régions à ajouter. Pour désélectionner une région tout en conservant les autres régions sélectionnées, maintenez la touche <i>‘SHIFT’</i> enfoncée en sélectionnant la région à supprimer.</li><li style='margin-bottom: 5px;'>Il est également possible de sélectionner des régions vers la zone de saisie <i>‘Selectionnez région(s)’</i> du <i>Menu</i> (voir la fenêtre d’aide <i>Le Menu (1 sur 3)</i>).</li></ul><li style='margin: 10px 0px;'><b>Pour déplacer la zone d'affichage sur la carte</b>: Effectuez un zoom avant ou arrière, ou un mouvement panoramique (<i>pan</i>). Il y a aussi des boutons pour:<ul><li style='margin-bottom: 5px;'>Dessiner un zone de zoom</li><li style='margin-bottom: 5px;'>Zoom sur tout le RDC</li><li style='margin-bottom: 5px;'>Voir la carte en mode plein écran</li></ul></li></ul></div>",
			  	position: 'bottom',
			  	tooltipClass: 'intro-map'
		    },{
		    	element: '#timeseries-container',
			    intro:"<div><p style='font-size:14px'><b>Les Histogrammes</b></p><p>Le premier histogramme affiche à la fois le <i>Nombre de Cas</i> (en barres) et la <i>Létalité</i> (en tant que ligne) pour la pathologie et les régions (Provinces ou Zones de Santé) sélectionnées. En survolant une barre affiche les statistiques pour cette semaine épidémiologique.</p><p>Le deuxième histogramme peut être utilisé pour sélectionner une période de temps. Cela met à jour la période affichée dans le premier histogramme (l'axe des x) et les statistiques affichées sur la carte. Elle peut être sélectionnée de la manière suivante:</p><ul><li style='margin-bottom: 5px;'>Passez la souris sur le deuxième histogramme. Lorsque le réticule apparaît, cliquez et glissez sur les barres pour sélectionner.</li><li style='margin-bottom: 5px;'>Cliquez et faites glisser l'une des poignées (à gauche ou à droite de l’intervalle de temps sélectionnée).</li><li style='margin-bottom: 5px;'>Cliquez sur l'un des boutons à droite des histogrammes pour sélectionner une intervalle de temps prédéfinie.</li><li style='margin-bottom: 5px;'>Pour sélectionner tout le temps disponible (toutes les barres), tirez les poignées vers les limites extérieures de l'histogramme ou cliquez quelque part sur l'histogramme mais en dehors de la sélection actuelle.</li></ul></div>",
			    position: 'top',
		    	tooltipClass: 'intro-medium'
		    },{
		    	element: '#timerange_buttons',
			    intro: "<div><p style='font-size:14px'><b>Boutons d'intervalle de temps</b></p><p>Sélectionnez facilement une intervalle de temps prédéfinie.</p></div>",
			    position: 'left',
		    	tooltipClass: 'intro-narrow'
		    },{
		    	element: '#play-container',
			    intro:"<div><p style='font-size:14px'><b>Jouer à l'animation</b></p><p>Pour <i>jouer</i> et mettre en <i>pause</i> une animation de la carte à travers le temps:</p><ul><li style='margin-bottom: 5px;'>Appuyez sur le bouton <i>Lecture</i> pour regarder la carte pendant chaque semaine épidémiologique de la sélection en cours (c'est-à-dire chaque semaine affichée dans le premier histogramme).</li><li style='margin-bottom: 5px;'>Appuyez sur le bouton <i>Pause</i> pour mettre en pause la fonction de lecture et afficher la carte pour la semaine épidémiologique actuellement sélectionnée uniquement. Notez qu'en mode <i>Pause</i>, il n'est pas possible d'interagir avec le dashboard pour modifier la sélection de données actuelle (par exemple, il est possible d'activer ou de désactiver le bouton <i>Rivières</i>, mais il n'est pas possible de modifier la pathologie sélectionnée).</li><li style='margin-bottom: 5px;'>Appuyez sur le bouton <i>Stop</i> pour quitter le mode de lecture et revenir à l'interaction complète du dashboard.</li></ul></div>",
		    	position: 'right',
		    	tooltipClass: 'intro-wide'
		    },
		    {
		    	intro:'<div><p style="font-size:14px"><p>Pour plus d\'information sur le dashboard développé pour le projet Pool d\'Urgence Congo, contactez le <a href="mailto:msfocb-rdc-puc-gis@brussels.msf.org">PUC GIS Officer</a>.</p></div>',
		    	tooltipClass: 'intro-medium'
		    },
		   /* {
			  intro:"<div><p style='font-size:14px'><b>Plus d'informations:</b></p><ul><li style='margin-bottom: 5px;'>Le projet Pool d'Urgence Congo est mis en œuvre par MSF OCB ...</li><li style='margin-bottom: 5px;'>Il est soutenu par ...</li><li style='margin-bottom: 5px;'>Le dashboard / tableau de bord a été développé en 2017 pour soutenir ....</li><li style='margin-bottom: 5px;'>Toutes les données sont ...</li></ul></div>",
			  tooltipClass: 'intro-wide'
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
          //console.log('all hints added: ', hints);
          intro.setOptions({hints: hints});
      });
      intro.onhintclick(function(hintElement, item, stepId) {
          //console.log('hint clicked', hintElement, item, stepId);
      });
      intro.onhintclose(function (stepId) {
          //console.log('hint closed', stepId);
          //console.log(document.querySelectorAll('.introjs-hidehint').length, hints.length)
		  if (document.querySelectorAll('.introjs-hidehint').length === hints.length) {
		  	$('#btnIntro').removeClass('on');
		  	//console.log("reset hints now")
		    intro.setOptions({hints: hints}) 
		  } 
      });
      intro.addHints();
  }

function removeHints() {
	//console.log('all hints removed');
	introJs().hideHints();
	introJs().refresh();
	//intro = introJs();
	//intro.setOptions({hints: hints});
}
