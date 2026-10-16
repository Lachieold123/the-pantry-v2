import re,sys
f=sys.argv[1];t=open(f).read()
t=re.sub(r'by your usual method(?! until)','by your usual method until tender and fluffy',t)
t=re.sub(r'per the packet(?! until)','per the packet until tender',t)
t=t.replace('per packet, drain','per packet until tender, drain').replace('per packet until tender, drain and rinse','per packet until tender, drain and rinse')
for a,b in [
("=== Masala Omelette Toast","=== Spiced Onion Omelette on Buttered Toast"),
("# Repeat with the remaining mixture, then toast the bread and spread with the remaining butter.\n# Sandwich or serve the omelettes on the toast.","# Repeat with the remaining mixture until set, then toast the bread until golden, spread with the remaining butter and serve the omelettes on the toast."),
("# Pour in the water, add the peas and salt, and bring to the boil.","# Pour in the water, add the peas and salt, and bring to the boil until bubbling."),
("# Bring the milk, water and salt to a simmer in a saucepan.","# Bring the milk, water and salt to a simmer in a saucepan until steaming."),
("=== Banh Mi Op La Egg Pan","=== Pâté Baguette with Pan-Fried Eggs and Soy"),
("=== Vetkoek with Curried Mince","=== Fried Bread Balls with Curried Beef Mince"),
("=== Chicken Sisig-Style Rice Bowls","=== Crisp Chopped Chicken Sisig Plates"),
("=== Cape Malay Chicken Curry","=== Apricot Cinnamon Chicken Curry Pot"),
("=== Mozambican Coconut Fish with Rice","=== Tomato Coconut Fish Pot with Chilli and Lemon"),
("=== Teriyaki Mushroom Rice Bowls","=== Glazed Shiitake and Edamame over Sushi Rice"),
("# Serve with coriander.\nN: 14 72","# Scatter with the coriander and serve over the rice.\nN: 14 72"),
("# Scatter with coriander.","# Scatter with the coriander and serve hot with plenty of the juices."),
("N: 13 44 15 4 780","N: 10 30 9 3 780"),
("- 1/2 cup neutral oil\n- 1/4 cup sweet chilli","- 3 tbsp neutral oil\n- 1/4 cup sweet chilli"),
("N: 17 30 22 2 680","N: 20 34 32 2 680"),
("N: 40 60 24 2 800","N: 44 62 28 2 800"),
("- 400ml coconut milk\n- 2 brown onion, diced\n- 4 garlic clove\n- 30g ginger","- 250ml coconut milk\n- 2 brown onion, diced\n- 4 garlic clove\n- 30g ginger"),
("N: 40 40 36 3 820","N: 42 44 40 3 820"),
("# Cook the vermicelli per the packet until tender and drain.","# Cook the vermicelli per the packet until tender and drain."),
("# Soften a wrapper in warm water, fill","# Soften a wrapper in warm water until pliable, fill"),
("# Whisk peanut butter, tamari, lime juice and a splash of water for dipping.","# Whisk peanut butter, tamari, lime juice and a splash of water until smooth for dipping."),
("# Sear mushrooms in oil 6 minutes.","# Sear mushrooms in oil 6 minutes until golden."),
("# Whisk peanut butter, soy, vinegar, sesame oil and a little warm water.","# Whisk peanut butter, soy, vinegar, sesame oil and a little warm water until smooth."),
("# Fry garlic and chilli 30 seconds, add","# Fry garlic and chilli 30 seconds until fragrant, add"),
]:
    if a not in t: print('MISSING',a[:40])
    t=t.replace(a,b)
open(f,'w').write(t)
