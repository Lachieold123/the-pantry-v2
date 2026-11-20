// Lane 7's own allergen and diet word lists, written independently of
// scripts/recipe-text-checks.mts. Each family: words that mean it is present,
// and words that look like it but are not (removed before matching).

export type Fam =
  | 'meat'
  | 'poultry'
  | 'pork'
  | 'beef'
  | 'lamb'
  | 'fish'
  | 'shellfish'
  | 'dairy'
  | 'egg'
  | 'gluten'
  | 'tree-nuts'
  | 'peanuts'
  | 'sesame'
  | 'soy'
  | 'honey'
  | 'rennet-gelatine';

const w = (s: string) => new RegExp(`\\b(?:${s})\\b`, 'g');

export const YES: Record<Fam, RegExp> = {
  poultry: w('chicken|chickens|turkey|duck|duckling|quail|goose|poussin|spatchcock|chicken stock|chicken broth|chicken liver|chicken livers'),
  pork: w(
    'pork|bacon|ham|hams|pancetta|prosciutto|guanciale|lardons?|lard|chorizo|salami|pepperoni|mortadella|nduja|speck|jamon|jamón|serrano|chicharr[oó]n|crackling|lap cheong|chinese sausage|char siu|pork belly|andouillette|black pudding|morcilla|kielbasa|bratwurst|frankfurts?|hot dogs?',
  ),
  beef: w('beef|steak|steaks|brisket|oxtail|veal|bresaola|pastrami|corned beef|bone marrow|wagyu|biltong|sirloin|rump|scotch fillet|eye fillet|chuck|short ribs?|suet|dripping|tallow'),
  lamb: w('lamb|mutton|hogget|goat|kid goat'),
  meat: w(
    'mince|meatballs?|sausages?|venison|kangaroo|rabbit|liver|livers|kidneys?|tripe|offal|gelatine|gelatin|bone broth|beef stock|chicken stock|meat stock|ham hock|pâté|pate|blood|stock cube|bouillon|gravy',
  ),
  fish: w(
    'fish|fillets? of fish|salmon|tuna|cod|barramundi|snapper|trout|mackerel|sardines?|anchov(?:y|ies)|bonito|katsuobushi|dashi|fish sauce|nam pla|nuoc mam|worcestershire|caesar dressing|haddock|hake|halibut|tilapia|whiting|flathead|bream|kingfish|swordfish|herring|kippers?|bottarga|caviar|roe|tarama|taramasalata|basa|ling|perch|monkfish|pollock|sole|john dory|mahi|eel|unagi|smoked fish|furikake|bagoong|patis',
  ),
  shellfish: w(
    'prawns?|shrimps?|shrimp paste|belacan|terasi|kapi|crab|crabs|lobster|crayfish|bugs?|moreton bay bugs?|scampi|langoustines?|mussels?|clams?|oysters?|oyster sauce|scallops?|squid|calamari|octopus|cuttlefish|pipis?|vongole|abalone|sea urchin|xo sauce|dried shrimp|krill|cockles?|whelks?|surimi|crab sticks?|seafood',
  ),
  dairy: w(
    'milk|cream|butter|buttermilk|ghee|cheese|cheeses|cheddar|parmesan|parmigiano|pecorino|grana padano|mozzarella|burrata|bocconcini|ricotta|feta|halloumi|haloumi|paneer|mascarpone|brie|camembert|gouda|gruy[eè]re|emmental|comt[eé]|fontina|manchego|gorgonzola|stilton|roquefort|taleggio|provolone|raclette|queso|cotija|labneh|yoghurt|yogurt|kefir|skyr|quark|whey|casein|cr[eè]me fra[iî]che|sour cream|custard|ice cream|gelato|condensed milk|evaporated milk|milk powder|curd|curds|kaymak|clotted|crema|dulce de leche|béchamel|bechamel|alfredo|tzatziki|raita|lassi|kulfi|khoa|khoya|malai|chhena|butter chicken|brioche|naan|pesto',
  ),
  egg: w('eggs?|egg yolks?|egg whites?|yolks?|whites|mayonnaise|mayo|aioli|meringues?|hollandaise|b[eé]arnaise|custard|brioche|egg noodles?|egg wash|frittata|omelette|pavlova|tamagoyaki|challah|carbonara|caesar dressing'),
  gluten: w(
    'wheat|flour|plain flour|self-raising|bread|breads|breadcrumbs?|panko|pasta|spaghetti|linguine|fettuccine|tagliatelle|pappardelle|penne|rigatoni|fusilli|farfalle|macaroni|lasagne|lasagna|orzo|ravioli|tortellini|gnocchi|couscous|bulgur|burghul|freekeh|farro|spelt|rye|barley|pearl barley|semolina|durum|seitan|noodles?|udon|ramen|soba|hokkien|vermicelli|wonton|dumpling wrappers?|gyoza wrappers?|spring roll wrappers?|filo|phyllo|puff pastry|shortcrust|pastry|croutons?|crackers?|biscuits?|cookies?|cake|sponge|brioche|croissants?|bagels?|baguette|ciabatta|sourdough|focaccia|pita|pitta|naan|roti|chapati|paratha|tortillas?|wraps?|flatbreads?|crumpets?|muffins?|english muffin|scones?|pancakes?|waffles?|batter|beer|lager|ale|stout|malt|soy sauce|shoyu|kecap manis|hoisin|teriyaki|oyster sauce|worcestershire|miso|gochujang|doenjang|black bean sauce|oats|oat|rolled oats|muesli|granola|cereal|weet-bix|stock cube|bouillon|gravy|roux|curry roux|bran',
  ),
  'tree-nuts': w(
    'almonds?|almond meal|almond flour|almond milk|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|macadamia|brazil nuts?|pine nuts?|pinenuts|chestnuts?|nuts|mixed nuts|praline|marzipan|frangipane|nougat|nutella|amaretti|amaretto|frangelico|pesto|dukkah|romesco|baklava|financiers?|candlenuts?|kemiri',
  ),
  peanuts: w('peanuts?|peanut butter|peanut oil|groundnuts?|satay|gado gado|kare kare|massaman'),
  sesame: w('sesame|sesame oil|sesame seeds?|tahini|tahina|halva|halvah|gomasio|za.atar|zaatar|dukkah|furikake|hummus|houmous|baba ganoush'),
  soy: w(
    'soy|soya|soy sauce|shoyu|tamari|tofu|tempeh|edamame|miso|kecap manis|hoisin|teriyaki|natto|bean curd|yuba|soybeans?|black bean sauce|doubanjiang|gochujang|doenjang|ponzu|tvp',
  ),
  honey: w('honey|honeycomb'),
  'rennet-gelatine': w('parmesan|parmigiano|pecorino|grana padano|gruy[eè]re|comt[eé]|fontina|manchego|gorgonzola|taleggio|emmental|gelatine|gelatin|pesto|roquefort'),
};

// Lookalikes removed before matching that family.
export const NOT: Partial<Record<Fam, RegExp>> = {
  dairy: w(
    '(?:coconut|almond|oat|soy|soya|rice|cashew|plant|plant-based|vegan|dairy-free|nut|macadamia|hemp|pea) (?:milk|cream|yoghurt|yogurt|butter|cheese|feta|parmesan|mozzarella|ice cream)|peanut butter|(?:almond|cashew|nut|seed|apple|cocoa|shea|sunflower|pumpkin seed) butter|cream of tartar|butter beans?|butternut(?: pumpkin| squash)?|butter lettuce|cream crackers|creamed corn|creamy|bean curd|soy curd|lemon curd|nutritional yeast|vegan (?:pesto|butter|cheese|mayo)|dairy-free|ice cream scoop|milk thistle|cream soda|buttery|creamed honey|coconut cream|milkfish|buttered|kaya',
  ),
  egg: w('eggplants?|egg-free|vegan mayo(?:nnaise)?|eggless|egg replacer|whites? (?:of|vinegar|wine|pepper|onions?|beans?|miso|rice|bread|fish|sugar|sesame|chocolate)|white (?:sugar|wine|vinegar|pepper|onion|bean|miso|rice|bread|fish|chocolate)|whites? of the leek|spring onion whites?|leek whites?'),
  poultry: w('chicken of the woods|vegetarian chicken|vegan chicken|chickpeas?|duck sauce|plum sauce'),
  meat: w(
    '(?:vegetable|vegetarian|vegan|mushroom|plant-based|meat-free|veggie|soy|lentil|tvp|quorn|beyond|impossible|mock|tofu) (?:stock|mince|sausages?|broth|bouillon|stock cube|gravy|meatballs?)|stock cube \\(vegetable\\)|minced (?:garlic|ginger|onion|shallot|chilli|lemongrass)|finely minced|mince(?:d)? (?:garlic|ginger)|blood oranges?|liver salts|kidney beans?|kidney bean',
  ),
  beef: w('(?:cauliflower|mushroom|tuna|salmon|fish|swordfish|cabbage|celeriac|eggplant|tofu|portobello|aubergine) steaks?|beefsteak tomato(?:es)?|rump of|chuck in|beef tomato(?:es)?|ox heart tomato(?:es)?'),
  pork: w('hamburger bun|graham|shams|hamper|ham-?fisted|mushroom bacon|coconut bacon|vegan bacon|vegetarian (?:ham|bacon|sausage)'),
  lamb: w("lamb's lettuce|lambs lettuce|goat's cheese|goats cheese|goat cheese|goat curd|goat's milk|goats milk|goat milk|goat yoghurt|goat feta"),
  fish: w(
    '(?:vegan|vegetarian|mushroom|plant-based) (?:fish sauce|dashi)|fish-free|kombu dashi|shiitake dashi|vegan worcestershire|vegetarian worcestershire|fish spatula|fish slice|fishcake mould|monkfish liver|ling(?:onberr(?:y|ies)|uine|ering|er)|sole of|perch on|basalt|basket|roe deer|eel(?:s)? of|sprinkle|fish kettle|mahi mahi(?= )',
  ),
  shellfish: w(
    'oyster mushrooms?|king oyster|mushroom oyster sauce|vegetarian oyster sauce|vegan oyster sauce|crab apple|crab apples|crabapple|seafood stock \\(or vegetable|bug spray|vegan (?:prawns?|shrimp)',
  ),
  gluten: w(
    '(?:rice|corn|maize|chickpea|gram|besan|tapioca|potato|almond|coconut|buckwheat|cassava|sorghum|gluten-free|gf|arrowroot|teff|millet|quinoa|banana|masa|chestnut|lentil|soy|sweet potato|mung bean|glutinous rice|glutinous|cornflour|tigernut|oat-free|lupin|cauliflower|plantain|cauliflower pizza|polenta|potato starch|nut) (?:flour|flours|noodles?|vermicelli|tortillas?|pasta|bread|starch|crackers?|wrappers?|paper|flakes|wraps?|pastry|crust|cakes?|batter|base)|rice paper|rice-paper|glass noodles?|(?:sweet potato|mung bean|kelp|shirataki|konjac|cellophane|bean thread|zucchini|vegetable|courgette|zoodle) noodles?|gluten-free \\w+|gf \\w+|corn tortillas?|tortilla chips|cornflour|tamari|buckwheat|wheat-free|flourless|cake tin|cake pan|baking paper|muffin tin|muffin pan|muffin tray|pancake turner|batter(?:ed)? with rice|cupcake cases|rice crackers?|rice cakes?|oat milk|crab cakes?|fish cakes?|potato cakes?|corn cakes?|rice wraps?|lettuce wraps?|lettuce cups?|nori|lager-free|gluten-free soy sauce|ginger beer|root beer|beer-battered\\? \\(gluten-free|crumble topping \\(gluten-free|malt vinegar(?= \\(or)|polenta|cornmeal|cornbread|biscuits? \\(gluten-free|stock cube \\(gluten-free|tapioca|sago|arrowroot|hokkien(?= \\(rice)',
  ),
  'tree-nuts': w('nutmeg|nutritional|butternut|nuts? \\(optional\\)(?=x)|coconut aminos|doughnuts?|donuts?|chestnut mushrooms?|water chestnuts?|nutty|nut-free|tiger ?nuts?|coconut sugar(?=x)|pine nut-free'),
  peanuts: w('peanut-free|peanut free'),
  sesame: w('sesame-free'),
  soy: w('soy-free|coconut aminos|soya-free|soy candle'),
  honey: w('honeydew|honey dew|honeycomb toffee|honey-free|honey ?suckle|honeycrisp'),
  'rennet-gelatine': w(
    'vegetarian (?:parmesan|pecorino|hard cheese|parmesan-style cheese|italian hard cheese|grana|gruy[eè]re|cheese)|parmesan-style|vegetarian rennet|vegan (?:parmesan|pesto|cheese)|agar|vegetarian gelatine|vegan gelatine|nut-free pesto',
  ),
};

export function families(textIn: string): Map<Fam, string[]> {
  const text = textIn.toLowerCase().normalize('NFC');
  const out = new Map<Fam, string[]>();
  for (const f of Object.keys(YES) as Fam[]) {
    const cleaned = NOT[f] ? text.replace(NOT[f]!, ' ') : text;
    const m = cleaned.match(YES[f]);
    if (m?.length) out.set(f, [...new Set(m)]);
  }
  return out;
}

// Coconut is a tree nut under FDA but not under FSANZ/ACCC Australian practice; keep it separate.
export const COCONUT = /\bcoconut\b/;

export const MEATS: Fam[] = ['meat', 'poultry', 'pork', 'beef', 'lamb'];
