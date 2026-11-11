# PF1 - Villes et Communautés — v2.6.0

## Bibliothèque de traits et suivi des sources

- Nouveau bouton **Bibliothèque de traits** dans le gestionnaire de villes.
- La bibliothèque regroupe les avantages et inconvénients intégrés ainsi que les traits personnalisés du monde.
- Chaque trait affiche désormais une **source explicite** : *Guide du Maître*, supplément / Adventure Path, campagne maison ou autre source.
- **Sécheresse** est identifiée comme provenant de *Skull & Shackles* ; les avantages et inconvénients génériques déjà intégrés sont étiquetés *Guide du Maître*.
- Création et modification de traits réutilisables avec les mêmes effets que les traits personnalisés locaux : Corruption, Criminalité, Économie, Loi, Folklore, Société, Danger, valeur de base, limite d'achat et incantation.
- Un trait de la bibliothèque peut être **appliqué à n'importe quelle ville ou quartier**. Les traits intégrés activent leur entrée native ; les traits personnels sont copiés dans la fiche et restent ensuite modifiables localement.
- Les avantages et inconvénients personnalisés d'une fiche possèdent maintenant des champs **Source** et **Type de source**, séparés des notes.
- Bouton signet sur chaque trait personnalisé local pour l'**enregistrer dans la bibliothèque** et le réutiliser ailleurs.
- **Import / export JSON** de la bibliothèque personnelle de traits pour transférer les créations entre mondes.
- Les traits intégrés ne sont jamais supprimés ou écrasés par l'import ; seuls les traits personnels sont exportés.
- Compatibilité complète avec les données v1.x à v2.5 : aucun changement destructif de schéma.

# PF1 - Villes et Communautés — v2.5.0

## Avantages personnalisés et traits extensibles

- Ajout d'un système d'**avantages personnalisés**, symétrique aux inconvénients personnalisés de la v2.4.
- Un avantage personnalisé peut modifier Corruption, Criminalité, Économie, Loi, Folklore, Société, Danger, valeur de base, limite d'achat et niveau d'incantation.
- Chaque avantage peut être activé/désactivé sans être supprimé et possède un champ **Notes / source**.
- Les avantages personnalisés actifs **comptent dans la limite d'avantages déterminée par la taille** de la communauté.
- Le tableau de bord signale donc aussi un dépassement lorsque la limite est franchie à cause d'un avantage personnalisé.
- Les profils envoyés dans le chat incluent désormais les avantages personnalisés actifs.
- Les anciens mondes restent compatibles : `customAdvantages` est facultatif et vaut un objet vide sur les communautés existantes.

Cette version complète la v2.4 : les suppléments et Adventure Paths peuvent désormais ajouter aussi bien des avantages que des inconvénients sans modifier le code du module.

# PF1 - Villes et Communautés — v2.4.0

## Inconvénients étendus et personnalisés

- Ajout de **Sécheresse** aux inconvénients de communauté : **Loi -4 ; Danger +10**. Cet inconvénient est attesté dans *Skull & Shackles* pour les Pétards du Frêle ; il ne faisait pas partie de la liste générique initiale du module.
- L'assistant de création v2.0 propose désormais également Sécheresse parmi les inconvénients disponibles.
- Nouveau système d'**inconvénients personnalisés** directement dans la fiche de ville/quartier.
- Un inconvénient personnalisé peut modifier Corruption, Criminalité, Économie, Loi, Folklore, Société, Danger, valeur de base, limite d'achat et niveau d'incantation.
- Chaque inconvénient personnalisé peut être activé/désactivé sans être supprimé et possède un champ de notes/source.
- Les effets actifs sont intégrés au calcul dérivé de la communauté et apparaissent dans le profil publié.
- Les anciennes fiches restent compatibles : `customDrawbacks` est facultatif et vaut simplement un objet vide sur les communautés existantes.

Cette extension permet de gérer proprement les inconvénients spécifiques à une campagne ou à un Adventure Path sans devoir ajouter un cas codé en dur pour chaque supplément.


## 2.0.1 — Correctif de défilement

- Ajout d'une barre de défilement verticale aux fiches de ville / communauté.
- Ajout d'une barre de défilement verticale aux fiches de faction.
- Le défilement horizontal est bloqué afin d'éviter les débordements accidentels.
- La barre de défilement reste visible quand le contenu dépasse la hauteur de la fenêtre et fonctionne avec les fenêtres redimensionnables de Foundry VTT v13.
- Aucun changement de structure de données : compatibilité complète avec les fiches créées en v1.x et v2.0.0.

# PF1 - Villes et Communautés — v2.0.0

## Nouveauté majeure : assistant de création

La v2.0 ajoute un assistant en quatre étapes pour créer une communauté ou un quartier PF1 :

1. identité, taille et population ;
2. alignement, gouvernement, avantages et inconvénients ;
3. génération optionnelle de lieux, factions, rumeurs et réglementations ;
4. résumé et création.

Les **valeurs mécaniques** (modificateur de base, Danger, marché, incantation, avantages/inconvénients) continuent d'utiliser le moteur PF1 du module basé sur les profils de communautés du Guide du Maître.

Les choix aléatoires de profil ainsi que les noms, lieux, factions, lois et rumeurs sont des **propositions du module**, et non des tables officielles PF1. Ils sont marqués comme tels dans les fiches générées et restent entièrement modifiables.

## Compatibilité

Les données créées avec les versions 1.0 à 1.9 sont conservées. Aucun changement de schéma destructif n'est effectué.

## Utilisation

Ouvre **Configuration du module → Gestionnaire de villes PF1**, puis clique sur **Assistant de création**.

## Changelog 2.0.0

- assistant de création en 4 étapes ;
- création de ville ou de quartier ;
- proposition aléatoire d'alignement, gouvernement, avantages et éventuel inconvénient ;
- population cohérente avec la catégorie choisie ;
- génération optionnelle de lieux structurés ;
- génération optionnelle de factions structurées ;
- génération optionnelle de rumeurs MJ ;
- génération optionnelle de réglementations locales ;
- intégration à l'API publique du module via `SettlementGenerator`.

# PF1 - Villes et Communautés

Module Foundry VTT v13 pour le système **Pathfinder 1 (PF1)**.

Il fournit des fiches de communautés inspirées du système du *Guide du Maître* : type de communauté, alignement, gouvernement, modificateurs, avantages, inconvénients, danger, démographie et place du marché.

## v1.9.0 — Lois, édits, taxes et réglementations locales

La v1.9 ajoute un véritable registre juridique à chaque ville et quartier. Le *Guide du Maître* décrit la caractéristique **Loi** comme le degré de rigidité des édits et l'organisation de la garde, et fait intervenir ce modificateur dans certaines interactions avec les autorités. En revanche, il ne fournit pas de code pénal ni de barème universel de taxes : le module distingue donc clairement les règles PF1 des outils de campagne décidés par le MJ.

- **Lois et édits structurés** : loi, décret, interdiction, obligation, licence/permis, couvre-feu, réglementation commerciale, magie, armes, ordre public ou texte personnalisé.
- États : **projet, en vigueur, suspendue, abrogée**.
- Chaque texte gère : champ d'application, description publique, mode d'application, sanction, autorité/faction, lieu, date d'effet, visibilité et notes MJ.
- Paramètres d'infraction facultatifs : gravité par défaut, amende et peine. Ces valeurs sont des choix du MJ et non un barème officiel.
- Bouton **Enregistrer une infraction** : crée directement une affaire dans le registre criminel de la v1.6, avec le texte enfreint, le suspect, la sanction et le lieu.
- **Impact politique optionnel** : une loi peut mémoriser une variation d'opinion et/ou de troubles puis l'appliquer au système politique de la v1.8. Le barème est choisi par le MJ.
- **Taxes et prélèvements** : taxe, péage, dîme, droit de douane, taxe de marché, droit de licence ou autre.
- Calcul au **pourcentage** ou en **montant fixe**, avec fréquence, assiette, exemptions, percepteur, lieu et date d'effet.
- Les prélèvements peuvent être marqués comme applicables au **marché** de la v1.4, sans modifier automatiquement les prix des Items PF1.
- Bouton **Calculer un prélèvement** : calcule le montant dû et le total à partir d'une transaction ou d'une somme choisie.
- Bouton **Publier le code local** : envoie au chat uniquement les lois et taxes publiques actuellement en vigueur.
- **Historique juridique** des créations, suppressions et changements de statut, avec la date du calendrier de la v1.7 quand elle est disponible.
- Les données sont enregistrées dans `flags.pf1-settlements.legislationState`.

## v1.8.0 — Politique et opinion publique

La v1.8 ajoute un tableau de bord politique à chaque ville et quartier. Le *Guide du Maître* décrit les six modificateurs de communauté comme des valeurs qui influencent directement certaines compétences en ville : Corruption, Criminalité, Économie, Loi, Folklore et Société. Cette version rend ces interactions plus faciles à utiliser en partie et ajoute, séparément, des outils narratifs pour suivre l'évolution politique locale.

- **Opinion publique globale** de -100 à +100, avec les attitudes Hostile, Inamicale, Indifférente, Amicale et Serviable. Les seuils numériques sont un outil du module et ne constituent pas une règle PF1.
- **Troubles sociaux** de 0 à 5 : calme, mécontentement, tension, manifestations, émeutes, insurrection. Cette échelle est également un outil narratif du module.
- **Réputations locales** pour les PJ, groupes ou autres personnalités, avec possibilité de lier un Actor PF1, score, visibilité et notes MJ.
- **Tensions entre factions** liées à la ville ou au quartier : niveau, tendance, enjeu, visibilité et notes. Les factions utilisent directement les fiches créées avec la v1.3.
- **Conséquences politiques** : une action des PJ peut modifier l'opinion publique et/ou les troubles sociaux, tout en conservant un historique daté avec le calendrier de la v1.7. Les valeurs de variation sont choisies par le MJ ; aucun barème officiel n'est inventé.
- **Outil “Test de communauté”** : saisie du bonus de compétence du personnage puis jet de `1d20 + compétence + modificateur de communauté`. Le module choisit le modificateur exact indiqué par le *Guide du Maître* et laisse le DD au MJ/règle concernée.
- Applications intégrées :
  - Corruption → Bluff contre fonctionnaires/gardes ; Discrétion en extérieur ;
  - Criminalité → Psychologie pour éviter de se faire Bluffer ; Escamotage des pickpockets ;
  - Économie → Artisanat, Représentation et Profession pour générer des revenus ;
  - Loi → Diplomatie contre les fonctionnaires du gouvernement ; Intimidation pour obliger à réagir amicalement ;
  - Folklore → Diplomatie pour rassembler des informations ; recherches de Connaissances utilisant les ressources de la ville ;
  - Société → Déguisement ; Diplomatie pour modifier l'attitude des fonctionnaires non-gouvernementaux.
- Les données sont enregistrées dans `flags.pf1-settlements.politicsState`.

## v1.7.0 — Calendrier et évolution de la communauté

La v1.7 ajoute un calendrier de campagne directement dans chaque fiche de ville ou de quartier. Le *Guide du Maître* recommande explicitement d'établir un calendrier pour suivre le passage du temps, les périodes d'immobilisation et les conséquences de ce temps sur le monde ; il suggère également de le remplir à l'avance avec les jours saints, festivals et événements importants afin de renforcer la vraisemblance et de fournir des accroches d'aventure.

- **Date de campagne** avec progression de +1 jour, +7 jours ou d'un nombre de jours libre.
- **Calendrier configurable** : nom de l'année, nombre et noms des mois, durée de chaque mois, jours de la semaine.
- Les valeurs initiales sont volontairement génériques (12 mois de 30 jours, semaine de 7 jours) : elles ne prétendent pas constituer un calendrier officiel de Golarion et peuvent être entièrement remplacées.
- **Dates importantes** : jour saint, festival/fête, événement civique, marché/foire, échéance, événement ou autre.
- Les dates peuvent être ponctuelles ou **récurrentes chaque année**, publiques ou réservées au MJ, et reliées à un lieu et une faction existants.
- Le passage du temps met automatiquement à jour les événements « à venir / aujourd'hui / passé ».
- **Travaux et projets** : construction, réparation, fortification, travaux publics, projet commercial ou religieux, avec date de début, durée, lieu, faction responsable et barre de progression.
- **Démographie** : application d'une variation de population (+/-), motif, type et date ; le champ Population de la fiche est mis à jour et l'historique conserve l'avant/après.
- **Chronique** : conservation des 100 dernières évolutions significatives (passage du temps, événements ajoutés, projets, population).
- Option de **synchronisation du marché** : chaque tranche de 7 jours écoulés peut déclencher automatiquement une nouvelle semaine de marché de la v1.4.
- Les durées de travaux et variations démographiques sont des outils de suivi du module ; le *Guide du Maître* ne fournit pas ici de barème universel pour ces valeurs.
- Les données sont enregistrées dans `flags.pf1-settlements.calendarState`.

## v1.6.0 — Garde, loi et criminalité

La v1.6 ajoute un tableau de bord consacré aux autorités locales et à la sécurité urbaine.

- Rappel directement sur la fiche des effets des modificateurs **Loi**, **Criminalité** et **Corruption** sur les compétences.
- Le bouton **Appeler la garde** reste fondé sur la règle officielle : test de Diplomatie + Loi, DD 5, arrivée en 1d6 minutes, délai réduit par tranche de 5 points au-dessus du DD.
- **Autorités liées** : il est possible d'assigner des Actors PF1 existants aux rôles de garde, officier, capitaine de la garde et geôlier. Le module conserve seulement leurs UUID.
- **Formations de milice** issues de la Galerie de PNJ : garde seul (FP 1), deux gardes (FP 3), quatre gardes (FP 5), six gardes + un officier (FP 7), ainsi que quatre gardes + un geôlier pour une petite prison (FP 6).
- Un bouton **Déployer une formation** enregistre le lieu et le motif, publie la composition dans le chat et conserve les 30 derniers déploiements.
- **Registre des affaires** : suivi des infractions, suspects liés à des Actors PF1, lieux, factions, gravité, état, primes, amendes, peines, preuves et notes MJ.
- Le registre peut publier un avis au chat sans révéler les preuves ni les notes du MJ.
- **Niveau d'alerte 0 à 5** pour suivre l'état sécuritaire de la ville. Ce niveau est explicitement un outil Foundry du module et non une règle officielle PF1.
- Les niveaux de gravité, états des affaires, primes, amendes et peines sont également des outils de campagne : le Guide du Maître ne fournit pas de barème universel de crimes et sentences.
- Les données sont enregistrées dans `flags.pf1-settlements.lawState`.

## v1.5.0 — Vie urbaine, rumeurs et rencontres

La v1.5 ajoute un véritable tableau de bord pour faire vivre chaque ville et chaque quartier pendant la campagne.

- **Rumeurs structurées** : texte, état actif/classé, véracité MJ, visibilité, lieu d'origine, faction liée et notes MJ.
- Une rumeur peut être envoyée au chat sans révéler sa véracité ni les notes du MJ.
- **Événements urbains** : titre, description, état (à venir / en cours / résolu), gravité de 1 à 5, visibilité, lieu, faction et notes.
- Le bouton **Inspiration** propose une idée à partir des exemples donnés dans le chapitre « Les villes » (vol à la tire, animal affolé, émeute, duel, incendie, agitateur, procession de notables, cadavre inquiétant). Cette fonction est explicitement une aide de préparation et **pas une table officielle**.
- **Rencontres urbaines** : intégration des tables 7-41 à 7-48 du *Guide du Maître* (arène, château/domaine, ménagerie/musée, toits, égouts, bas-quartiers, taverne, guilde des voleurs).
- Le jet suit la règle du profil de communauté : `1d100 + Danger`, avec un résultat limité entre 1 et 100, puis lecture de la table classée du FP le plus faible au plus fort.
- Chaque résultat affiche la rencontre, son FP moyen et la référence indiquée par le Guide.
- Les 30 derniers jets sont conservés dans un historique par ville/quartier.
- Les données sont enregistrées dans `flags.pf1-settlements.urbanState`.

### Note sur la table 7-42

La VF fournie du *Guide du Maître* contient des plages de d% manifestement incohérentes dans la table 7-42 « Le château/domaine » (chevauchements et une plage imprimée `96-71`). Pour éviter un tableau impossible à résoudre, le module utilise les plages de l'édition anglaise originale pour cette table : `59-63`, `64-68`, `69-71`, puis `72-74`, etc. Le contenu des rencontres reste celui de la VF.

## v1.4.0 — Marché dynamique et stocks PF1

La v1.4 transforme la « Place du marché » en véritable outil de suivi hebdomadaire tout en respectant la logique du *Guide du Maître*.

- Les quantités d'objets magiques dépassant la valeur de base sont tirées selon le type de communauté.
- L'inconvénient **Pauvreté** réduit automatiquement de moitié les quantités obtenues.
- Une métropole conserve la règle « tous » pour les objets de faible puissance.
- Le marché possède un numéro de **semaine** ; passer à la semaine suivante relance les quantités et permet de retenter les objets précédemment indisponibles.
- Les tests pour un objet dont le prix est inférieur ou égal à la valeur de base utilisent les **75 % de disponibilité** et sont mémorisés pour empêcher plusieurs jets dans la même semaine.
- Pour les objets plus chers que la valeur de base, le module vérifie le **stock explicite** au lieu d'appliquer les 75 %.
- Le stock peut contenir de vrais **Items PF1** du monde ou des compendiums par glisser-déposer.
- Chaque entrée de stock possède : puissance, prix, quantité, vendeur/établissement, notes MJ et état disponible/vendu.
- Les vendeurs peuvent être liés aux fiches de lieux de la ville ou de ses quartiers.
- Les objets vendus sont retirés automatiquement lors du passage à la semaine suivante.
- Les données de marché sont conservées dans `flags.pf1-settlements.marketState`.

Le Guide du Maître renvoie au *Manuel des Joueurs* pour les tables exactes servant à déterminer l'identité des objets magiques. Le module automatise donc exactement les **quantités** et la **disponibilité**, mais laisse le MJ choisir ou glisser les objets PF1 précis dans les emplacements plutôt que d'inventer une table de génération absente de la source fournie.

## v1.3.0 — Factions et organisations

La v1.3 transforme le champ « Groupes/Factions » de la feuille de ville en véritables fiches Foundry structurées, tout en conservant l'ancien champ texte pour compatibilité.

- Nouvelle fiche **Faction / organisation** stockée comme `JournalEntry`.
- Types : autorité, guilde, culte, maison noble, organisation criminelle, compagnie marchande, ordre militaire, cercle arcanique, société secrète, mouvement politique et autre.
- Liaison d'un **Actor PF1** comme chef ou représentant, par sélection ou glisser-déposer.
- Liaison d'un **lieu existant** comme siège ou quartier général.
- Une faction peut posséder plusieurs **zones d'influence** dans différentes villes et différents quartiers.
- Niveaux d'influence : présence, faible, modérée, forte et dominante. Ces niveaux servent au suivi dans Foundry et ne constituent pas une nouvelle règle PF1.
- Relations structurées entre factions : alliée, amicale, neutre, rivale ou ennemie. Les relations sont synchronisées sur les deux fiches.
- Champs : description publique, objectifs, ressources, méthodes, rumeurs, secrets du MJ et notes.
- Bouton **Envoyer au chat** qui ne publie pas les secrets du MJ.
- Les fiches de ville et de quartier affichent les factions qui y exercent une influence.
- Boutons **Créer une faction**, **Lier existante**, **Ouvrir** et **Retirer le lien local** directement depuis une ville/quartier.
- Le gestionnaire central affiche les factions avec leur nombre de zones d'influence et de relations.

## v1.2.0 — Lieux et établissements

La v1.2 transforme les « localités » en véritables fiches Foundry indépendantes et liées à une communauté.

- Bouton **Créer un lieu** sur chaque fiche de ville et de quartier.
- Types proposés : taverne, auberge, boutique, marché, temple, sanctuaire, guilde, atelier, bâtiment officiel, fortification, port/quai, résidence, lieu remarquable et autre.
- Chaque lieu peut être rattaché à une **ville** et éventuellement à un **quartier** précis.
- La fiche de lieu gère :
  - adresse / emplacement ;
  - mots-clés ;
  - niveau de prix ;
  - description publique ;
  - services et marchandises ;
  - rumeurs / accroches d'aventure ;
  - secrets du MJ ;
  - notes.
- Un **Actor PF1** peut être lié comme propriétaire ou responsable du lieu.
- Le responsable peut être sélectionné ou ajouté par **glisser-déposer**.
- Boutons directs pour ouvrir la ville, le quartier et le responsable.
- Bouton **Envoyer au chat** qui publie uniquement les informations publiques du lieu (pas les secrets du MJ).
- Le gestionnaire de villes affiche maintenant les lieux sous leurs communautés, avec le quartier éventuel.
- Détection des **lieux orphelins** si leur ville a été supprimée.
- Le champ texte historique « Localités » reste présent sous le nom **Localités — notes libres** afin de ne perdre aucune donnée des versions 1.0/1.1.

## v1.1.0 — Quartiers et PNJ liés

- Une ville peut posséder plusieurs **quartiers**.
- Chaque quartier est une fiche de communauté complète avec son propre profil.
- Les **PNJ importants** peuvent être liés directement à des fiches Actor PF1.
- Ajout d'un PNJ via un sélecteur ou par glisser-déposer.
- Le gestionnaire affiche une arborescence ville → quartiers.

## Installation / mise à jour

1. Fermer Foundry VTT.
2. Remplacer le dossier `Data/modules/pf1-settlements` par celui contenu dans l'archive.
3. Relancer Foundry.
4. Activer **PF1 - Villes et Communautés** dans le monde Pathfinder 1.
5. Les fiches créées avec les versions 1.0 à 2.5 sont conservées.

## Données

Les fiches de ville et de quartier sont des `JournalEntry` utilisant :

- `flags.pf1-settlements.isSettlement`
- `flags.pf1-settlements.config`
- `flags.pf1-settlements.derived`

Les fiches de lieu utilisent :

- `flags.pf1-settlements.isLocation`
- `flags.pf1-settlements.locationConfig`

Les fiches de faction utilisent :

- `flags.pf1-settlements.isFaction`
- `flags.pf1-settlements.factionConfig`

Les marchés utilisent :

- `flags.pf1-settlements.marketState`

La vie urbaine utilise :

- `flags.pf1-settlements.urbanState`

La garde, la loi et le registre criminel utilisent :

- `flags.pf1-settlements.lawState`

Le calendrier et l’évolution de la communauté utilisent :

- `flags.pf1-settlements.calendarState`

La politique et l’opinion publique utilisent :

- `flags.pf1-settlements.politicsState`

Les lois, édits, taxes et réglementations utilisent :

- `flags.pf1-settlements.legislationState`

Les références vers les PNJ utilisent des UUID d'Actor et ne copient pas les données de la fiche PF1.

## API

```js
game.modules.get("pf1-settlements").api
```

Fonctions principales :

- `createSettlement(name, overrides)`
- `createDistrict(parent, name)`
- `getSettlements()`
- `getRootSettlements()`
- `getDistricts(parent)`
- `createLocation(parent, name, overrides)`
- `getLocations()`
- `getLocationsForSettlement(settlement, options)`
- `getLocationsForDistrict(district)`
- `setLocationParent(location, settlementId, districtId)`
- `calculateSettlement(config)`
- `createFaction(parent, name, overrides)`
- `getFactions()`
- `getFactionsForSettlement(settlement, options)`
- `addFactionInfluence(faction, settlementId, districtId, level, notes)`
- `setFactionRelation(source, target, status, notes)`
- `getMarketState(settlement)`
- `saveMarketState(settlement, state)`
- `generateMarketSlots(settlement)`
- `advanceMarketWeek(settlement, options)`
- `addMarketItem(settlement, item, options)`
- `updateMarketItem(settlement, entryId, changes)`
- `removeMarketItem(settlement, entryId)`
- `getUrbanState(settlement)`
- `saveUrbanState(settlement, state)`
- `addRumor(settlement, data)` / `updateRumor(...)` / `removeRumor(...)`
- `addUrbanEvent(settlement, data)` / `updateUrbanEvent(...)` / `removeUrbanEvent(...)`
- `rollUrbanEncounter(settlement, tableKey, dangerModifier)`
- `clearEncounterHistory(settlement)`
- `getLawState(settlement)` / `saveLawState(settlement, state)`
- `setAlertLevel(settlement, level)`
- `setAuthorityActor(settlement, role, actorOrUuid)` / `clearAuthorityActor(...)`
- `addCrime(settlement, data)` / `updateCrime(...)` / `removeCrime(...)`
- `recordPatrol(settlement, formationKey, data)` / `clearPatrolHistory(settlement)`
- `getCalendarState(settlement)` / `saveCalendarState(settlement, state)`
- `configureCalendar(settlement, changes)` / `setCalendarDate(settlement, date)`
- `advanceCalendar(settlement, days)`
- `addCalendarEntry(settlement, data)` / `updateCalendarEntry(...)` / `removeCalendarEntry(...)`
- `addProject(settlement, data)` / `updateProject(...)` / `removeProject(...)`
- `applyPopulationChange(settlement, delta, data)`
- `getPoliticsState(settlement)` / `savePoliticsState(settlement, state)`
- `setPublicOpinion(settlement, score, notes)` / `setUnrestLevel(settlement, level, notes)`
- `addLocalReputation(settlement, data)` / `updateLocalReputation(...)` / `removeLocalReputation(...)`
- `addFactionTension(settlement, data)` / `updateFactionTension(...)` / `removeFactionTension(...)`
- `applyPoliticalConsequence(settlement, data)` / `removePoliticalConsequence(...)` / `clearPoliticalHistory(...)`
- `getLegislationState(settlement)` / `saveLegislationState(settlement, state)`
- `addLegislation(settlement, data)` / `updateLegislation(...)` / `setLegislationStatus(...)` / `removeLegislation(...)`
- `addLevy(settlement, data)` / `updateLevy(...)` / `removeLevy(...)`
- `calculateLevy(levy, baseAmount)` / `getActiveLegislation(settlement)` / `getActiveLevies(settlement)`
- `clearLegislationHistory(settlement)`

## v2.1.0 — Modèles, duplication et import/export

Cette version ajoute des outils de préparation et de transfert de communautés :

- duplication sélective d'une ville ou d'un quartier ;
- copie optionnelle des quartiers, lieux, factions, marché, vie urbaine, garde/criminalité, calendrier, politique et législation ;
- export JSON d'une communauté avec ses quartiers, lieux, factions et relations internes ;
- import JSON avec remappage automatique des identifiants liés ;
- modèles personnels enregistrés à partir d'une fiche existante ;
- cinq modèles génériques fournis par le module : village de pêcheurs, port commercial, port pirate, petite ville fortifiée et métropole ;
- transformation ville ↔ quartier avec transfert des lieux et influences de faction ;
- réinitialisation des seuls contenus identifiés comme générés automatiquement par l'assistant ;
- conservation du défilement vertical des fiches introduit en v2.0.1.

Les modèles intégrés et les contenus générés sont des aides de préparation génériques du module ; ils ne constituent pas de nouvelles règles officielles de Pathfinder 1.

### Compatibilité

Les données créées avec les versions 1.0 à 2.0.1 restent compatibles. Aucun processus de migration destructive n'est exécuté.


## v2.2.0 — Tableau de bord et navigation rapide

Cette version améliore l'utilisation des fiches devenues très longues au fil des versions :

- tableau de bord synthétique en tête de chaque ville ou quartier ;
- résumé immédiat de la population, du Danger, du marché, des rumeurs, des événements, de l'opinion, des troubles et de la législation ;
- alertes cliquables pour les situations importantes (troubles élevés, garde en alerte, événements en cours, personnes recherchées, incohérences de fiche) ;
- barre de navigation collante permettant d'aller directement aux quartiers, lieux, factions, traits, marché, vie urbaine, garde, calendrier, politique, lois ou notes ;
- navigation rapide équivalente sur les fiches de faction ;
- maintien du défilement vertical de la v2.0.1 ;
- aucune migration de données : le tableau de bord est calculé à partir des systèmes déjà présents.

Les alertes sont uniquement une synthèse d'éléments déjà enregistrés dans la communauté. Elles n'ajoutent aucune nouvelle règle Pathfinder 1.


## v2.3.0 — Réseau politique et carte des factions

Cette version ajoute une vue transversale des factions et de leurs rapports :

- nouveau bouton **Réseau politique** dans le gestionnaire de communautés ;
- filtre global ou par ville ;
- représentation graphique des factions actives et de leurs relations ;
- couleurs distinctes pour les relations alliées, amicales, rivales, ennemies et neutres ;
- possibilité de masquer les relations neutres pour alléger la lecture ;
- superposition des tensions politiques enregistrées dans la communauté ;
- résumé des niveaux de tension et de leur tendance ;
- liste accessible des factions et des relations en complément du graphe ;
- clic ou clavier sur une faction pour ouvrir directement sa fiche ;
- aucune nouvelle donnée obligatoire et aucune migration destructive.

Le réseau politique est un outil de visualisation : il synthétise les influences, relations et tensions déjà enregistrées dans les versions précédentes. Il n'ajoute aucune règle Pathfinder 1.
