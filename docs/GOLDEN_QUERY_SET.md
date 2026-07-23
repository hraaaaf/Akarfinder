# AkarFinder — Golden Query Set

**Version : 2026-07-23**
**Statut : baseline de certification Search Depth — documentation uniquement**

## But

Mesurer si l'augmentation du volume DATA améliore réellement `/search`.

Le même jeu de requêtes doit être rejoué aux checkpoints :

- baseline actuelle (~840 structured listings) ;
- 2k ;
- 5k ;
- 10k ;
- 30k+ canonical properties.

## Dimensions de scoring par requête

Chaque requête reçoit une note sur 100 :

- Pertinence top résultats : 30 ;
- Profondeur utile : 20 ;
- Diversité des sources / offres : 15 ;
- Fraîcheur / preuve temporelle : 10 ;
- Faible bruit : 10 ;
- Doublons maîtrisés : 10 ;
- Couverture géographique correcte : 5.

### Verdict

- 80–100 : satisfaisant ;
- 65–79 : acceptable mais améliorable ;
- <65 : insuffisant.

Gate global cible : **≥80 % des recherches communes classées satisfaisantes**.

---

# Set V1 — 60 requêtes

## Casablanca — achat

1. appartement Casablanca 2 chambres
2. appartement Casablanca 3 chambres
3. studio Casablanca achat
4. appartement Maarif achat
5. appartement Racine Casablanca
6. appartement Bourgogne Casablanca
7. appartement Californie Casablanca
8. appartement Ain Diab achat
9. villa Ain Diab
10. villa Californie Casablanca
11. villa Bouskoura
12. terrain Bouskoura
13. terrain industriel Bouskoura
14. bureau Casablanca centre
15. local commercial Casablanca

## Casablanca — location

16. appartement Casablanca location 2 chambres
17. studio Maarif location
18. appartement Racine location
19. appartement Bourgogne location
20. appartement Ain Diab location
21. villa Casablanca location
22. bureau Casablanca location

## Rabat / Salé / Témara

23. appartement Agdal Rabat location
24. appartement Agdal Rabat achat
25. appartement Hay Riad achat
26. villa Hay Riad
27. villa Souissi Rabat
28. appartement Hassan Rabat
29. appartement Océan Rabat
30. appartement Salé achat
31. appartement Salé location
32. appartement Témara achat
33. villa Harhoura
34. appartement Harhoura

## Marrakech

35. appartement Marrakech achat
36. appartement Marrakech location
37. appartement Guéliz achat
38. appartement Guéliz location
39. appartement Hivernage
40. villa Marrakech piscine
41. villa Route de l'Ourika
42. villa Palmeraie Marrakech
43. terrain Marrakech
44. riad Marrakech vente

## Tanger

45. appartement Tanger centre
46. appartement Tanger achat
47. appartement Tanger location
48. appartement Malabata
49. villa Tanger
50. terrain Tanger

## Agadir

51. appartement Agadir achat
52. appartement Agadir location
53. appartement Founty
54. villa Agadir
55. terrain Agadir

## Autres villes / couverture nationale

56. appartement Fès achat
57. appartement Meknès achat
58. appartement Kénitra achat
59. appartement El Jadida achat
60. appartement Oujda achat

---

## Règles d'évaluation

Pour chaque requête :

1. capturer le nombre total de résultats récupérables ;
2. auditer au minimum les 20 premiers résultats si disponibles ;
3. noter les résultats manifestement hors intention ;
4. compter les doublons visibles / quasi-doublons ;
5. compter les sources distinctes ;
6. vérifier si le type / transaction / ville correspondent ;
7. relever les résultats stale / morts quand la preuve existe ;
8. mesurer la profondeur après `Afficher plus` lorsque pertinent ;
9. noter séparément les thin results et les structured listings ;
10. conserver le snapshot pour comparaison au checkpoint suivant.

## Ce que le score ne doit pas faire

- favoriser artificiellement un résultat partenaire ;
- pénaliser une donnée simplement parce qu'elle est absente si elle n'est pas disponible légalement ;
- confondre quantité et pertinence ;
- compter plusieurs variantes du même bien comme profondeur réelle ;
- considérer un lien mort comme couverture utile.

## Extension V2 après baseline

Après la première exécution, compléter avec :

- requêtes budget (`moins de 1M DH`, etc.) ;
- surface ;
- nombre de chambres ;
- requêtes AR ;
- fautes / translittérations courantes ;
- quartiers secondaires ;
- neuf / promoteur ;
- bureaux / commerces ;
- terrains agricoles / industriels selon couverture.

Le set V1 doit rester figé pour permettre une comparaison longitudinale fiable.
