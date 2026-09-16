"""
FilmMatch AI — TMDB Service Client
Async client for searching films, fetching credits/keywords, audience reviews, and generating rich candidate pools with TTL caching.
Provides live TMDB discovery and trending queries with verified TMDB metadata and poster URLs.
"""
import asyncio
import re
import time
from typing import Optional, Any
import httpx

from backend.config import settings
from backend.schemas import MovieSearchItem
from backend.services.provenance import TMDBFailure, is_demo, record, timestamp
from ml.content_engine import MovieMetadata

# Standard TMDB Genre ID mapping
TMDB_GENRES = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
}

# Regional Language Priorities
REGIONAL_LANGUAGES = ["te", "hi", "ta", "ml", "kn"]

# Comprehensive Verified TMDB Catalog across Regional and Global cinema
OFFLINE_CATALOG: list[MovieMetadata] = [

    # --- TELUGU (te) ---
    MovieMetadata(
        tmdb_id=579974, title="RRR",
        overview="A fearless warrior on a perilous mission and a steely cop in service of the British forces cross paths in pre-independence India.",
        genres=["Action", "Drama", "History"], director="S. S. Rajamouli",
        cast=["N. T. Rama Rao Jr.", "Ram Charan", "Alia Bhatt", "Ajay Devgn"],
        keywords=["revolution", "friendship", "freedom fighter", "british empire", "epic battle"],
        original_language="te", release_date="2022-03-24",
        poster_url="https://image.tmdb.org/t/p/w500/tjpiEnZBUAA8pdNPRKa5vP2Zpqw.jpg",
        backdrop_url="",
        vote_average=8.8, vote_count=1850,
    ),
    MovieMetadata(
        tmdb_id=256040, title="Baahubali: The Beginning",
        overview="In ancient India, an adventurous man becomes embroiled in an ancient feud and learns of his royal ancestry.",
        genres=["Action", "Drama", "Fantasy"], director="S. S. Rajamouli",
        cast=["Prabhas", "Rana Daggubati", "Anushka Shetty", "Tamannaah Bhatia"],
        keywords=["kingdom", "royalty", "warfare", "destiny", "heroic journey"],
        original_language="te", release_date="2015-07-10",
        poster_url="https://image.tmdb.org/t/p/w500/9BAjt8nSSms62uOVYn1t3C3dVto.jpg",
        backdrop_url="",
        vote_average=8.4, vote_count=1350,
    ),
    MovieMetadata(
        tmdb_id=350312, title="Baahubali 2: The Conclusion",
        overview="When Shiva, the son of Bahubali, learns about his heritage, he begins to look for answers while unfolding the tragic betrayal that shattered Mahishmati.",
        genres=["Action", "Drama", "Fantasy"], director="S. S. Rajamouli",
        cast=["Prabhas", "Rana Daggubati", "Anushka Shetty", "Ramya Krishnan"],
        keywords=["maheshmati", "betrayal", "coronation", "epic duel", "destiny"],
        original_language="te", release_date="2017-04-28",
        poster_url="https://image.tmdb.org/t/p/w500/sXf30F2HFpsFPXlNz7jpOySSV9I.jpg",
        backdrop_url="",
        vote_average=8.6, vote_count=1450,
    ),
    MovieMetadata(
        tmdb_id=690957, title="Pushpa: The Rise",
        overview="A laborer rises through the ranks of a red sandalwood smuggling syndicate, making powerful enemies along the way.",
        genres=["Action", "Crime", "Drama"], director="Sukumar",
        cast=["Allu Arjun", "Rashmika Mandanna", "Fahadh Faasil", "Jagadeesh Prathap Bandari"],
        keywords=["smuggling", "forest", "rivalry", "underworld", "rise to power"],
        original_language="te", release_date="2021-12-17",
        poster_url="https://image.tmdb.org/t/p/w500/w2RG8J3um9F3eggUeJVuuAI0RFk.jpg",
        backdrop_url="",
        vote_average=8.2, vote_count=1100,
    ),
    MovieMetadata(
        tmdb_id=592898, title="Jersey",
        overview="A thirty-six-year-old former cricketer returns to the pitch driven by the desire to represent the Indian cricket team and fulfill his son's wish.",
        genres=["Drama", "Sport"], director="Gowtam Tinnanuri",
        cast=["Nani", "Shraddha Srinath", "Sathyaraj", "Ronit Kamra"],
        keywords=["cricket", "father son", "redemption", "perseverance", "sports comeback"],
        original_language="te", release_date="2019-04-19",
        poster_url="https://image.tmdb.org/t/p/w500/bU9q9yVtxeBiC0Do27CekHXNE6D.jpg",
        backdrop_url="",
        vote_average=8.5, vote_count=890,
    ),
    MovieMetadata(
        tmdb_id=628241, title="Ala Vaikunthapurramuloo",
        overview="After growing up enduring the contempt of his strict foster father, a young man discovers his true noble lineage and steps up to defend his biological family.",
        genres=["Action", "Comedy", "Drama"], director="Trivikram Srinivas",
        cast=["Allu Arjun", "Pooja Hegde", "Tabu", "Jayaram", "Murali Sharma"],
        keywords=["swapped babies", "family drama", "stylish action", "corporate rivalry"],
        original_language="te", release_date="2020-01-12",
        poster_url="https://image.tmdb.org/t/p/w500/aWTQLqS5bdxeusr6mMBhH9TNJ1n.jpg",
        backdrop_url="",
        vote_average=8.1, vote_count=780,
    ),
    MovieMetadata(
        tmdb_id=466336, title="Arjun Reddy",
        overview="A high-functioning alcoholic surgeon with anger management issues goes into a self-destructive spiral after his girlfriend is forced to marry another man.",
        genres=["Drama", "Romance"], director="Sandeep Reddy Vanga",
        cast=["Vijay Deverakonda", "Shalini Pandey", "Rahul Ramakrishna", "Jia Sharma"],
        keywords=["obsession", "heartbreak", "medical student", "rebellion", "addiction"],
        original_language="te", release_date="2017-08-25",
        poster_url="https://image.tmdb.org/t/p/w500/oWB6CzyW4QO1rm3BzJwIIWF47yo.jpg",
        backdrop_url="",
        vote_average=8.0, vote_count=920,
    ),
    MovieMetadata(
        tmdb_id=894803, title="Sita Ramam",
        overview="An orphaned soldier Lieutenant Ram receives letters from an unknown woman named Sita Mahalakshmi, unraveling an epic poetic love story during wartime.",
        genres=["Drama", "Romance", "War"], director="Hanu Raghavapudi",
        cast=["Dulquer Salmaan", "Mrunal Thakur", "Rashmika Mandanna", "Sumanth"],
        keywords=["military letters", "kashmir", "poetic romance", "wartime devotion", "patriotism"],
        original_language="te", release_date="2022-08-05",
        poster_url="https://image.tmdb.org/t/p/w500/t1O94ZBzsQXJihtVkrsStRLyUDR.jpg",
        backdrop_url="",
        vote_average=8.6, vote_count=950,
    ),
    MovieMetadata(
        tmdb_id=25538, title="Magadheera",
        overview="A bike stuntman who recalls his past life as a fierce 17th-century warrior seeks to protect his reincarnated true love from their former nemesis.",
        genres=["Action", "Fantasy", "Romance"], director="S. S. Rajamouli",
        cast=["Ram Charan", "Kajal Aggarwal", "Dev Gill", "Srihari"],
        keywords=["reincarnation", "ancient warrior", "undying love", "horse duel", "kingdom"],
        original_language="te", release_date="2009-07-30",
        poster_url="https://image.tmdb.org/t/p/w500/mR8dSQZI8X6Z1NClJhFrtJp636z.jpg",
        backdrop_url="",
        vote_average=8.2, vote_count=870,
    ),
    MovieMetadata(
        tmdb_id=148265, title="Eega",
        overview="A murdered young man is reincarnated as a common housefly to seek vengeance against his wealthy killer and protect his beloved.",
        genres=["Action", "Comedy", "Fantasy"], director="S. S. Rajamouli",
        cast=["Nani", "Samantha Ruth Prabhu", "Sudeep"],
        keywords=["housefly", "reincarnation revenge", "innovative thriller", "cgi animation"],
        original_language="te", release_date="2012-07-06",
        poster_url="https://image.tmdb.org/t/p/w500/hxaxaZjVO2p35KswdXhXR2mSQQp.jpg",
        backdrop_url="",
        vote_average=8.3, vote_count=910,
    ),
    MovieMetadata(
        tmdb_id=801688, title="Kalki 2898 AD",
        overview="In the year 2898 AD, around 6000 years after Kurukshetra war, Ashwatthama gears up for his final battle of redemption at the sign of hope in a dystopian world and Bhairava, a wisecracking bounty hunter, enters the fray.",
        genres=["Action", "Science Fiction", "Drama", "Fantasy"], director="Nag Ashwin",
        cast=["Prabhas", "Amitabh Bachchan", "Deepika Padukone", "Kamal Haasan", "Saswata Chatterjee"],
        keywords=["dystopia", "rebellion", "futuristic society", "mythology", "quest", "bounty hunter", "kurukshetra war"],
        original_language="te", release_date="2024-06-26",
        poster_url="https://image.tmdb.org/t/p/w500/rstcAnBeCkxNQjNp3YXrF6IP1tW.jpg",
        backdrop_url="https://image.tmdb.org/t/p/w1280/o8XSR1SONnjcsv84NRu6Mwsl5io.jpg",
        vote_average=6.4, vote_count=193,
    ),

    # --- HINDI (hi) ---
    MovieMetadata(
        tmdb_id=360814, title="Dangal",
        overview="Former wrestler Mahavir Singh Phogat and his two wrestler daughters struggle towards glory at the Commonwealth Games in the face of societal oppression.",
        genres=["Biography", "Drama", "Sport"], director="Nitesh Tiwari",
        cast=["Aamir Khan", "Fatima Sana Shaikh", "Sanya Malhotra", "Sakshi Tanwar"],
        keywords=["wrestling", "female empowerment", "father daughters", "olympics", "discipline"],
        original_language="hi", release_date="2016-12-23",
        poster_url="https://image.tmdb.org/t/p/w500/cJRPOLEexI7qp2DKtFfCh7YaaUG.jpg",
        backdrop_url="",
        vote_average=8.6, vote_count=2100,
    ),
    MovieMetadata(
        tmdb_id=20453, title="3 Idiots",
        overview="Two friends search for their long-lost companion while recalling their college days and a friend who inspired them to think differently.",
        genres=["Comedy", "Drama"], director="Rajkumar Hirani",
        cast=["Aamir Khan", "R. Madhavan", "Sharman Joshi", "Kareena Kapoor"],
        keywords=["engineering college", "friendship", "education pressure", "invention", "road trip"],
        original_language="hi", release_date="2009-12-25",
        poster_url="https://image.tmdb.org/t/p/w500/gmSRHU1Wtiatj8KoyVt8rT9ockx.jpg",
        backdrop_url="",
        vote_average=8.5, vote_count=2400,
    ),
    MovieMetadata(
        tmdb_id=40662, title="Sholay",
        overview="After his family is murdered by a notorious and ruthless bandit, a former police officer enlists the services of two outlaws to capture him.",
        genres=["Action", "Adventure", "Drama"], director="Ramesh Sippy",
        cast=["Dharmendra", "Amitabh Bachchan", "Sanjeev Kumar", "Hema Malini", "Amjad Khan"],
        keywords=["bandit", "revenge", "outlaw duo", "rural justice", "western classic"],
        original_language="hi", release_date="1975-08-15",
        poster_url="https://image.tmdb.org/t/p/w500/7lmHqHg1rG9b4U8MjuyQjmJ7Qm0.jpg",
        backdrop_url="",
        vote_average=8.2, vote_count=980,
    ),
    MovieMetadata(
        tmdb_id=89366, title="Gangs of Wasseypur",
        overview="A clash between Sultan and Shahid Khan leads to the expulsion of Khan from Wasseypur, igniting a deadly multi-generational blood feud.",
        genres=["Action", "Crime", "Drama"], director="Anurag Kashyap",
        cast=["Manoj Bajpayee", "Nawazuddin Siddiqui", "Richa Chadha", "Huma Qureshi"],
        keywords=["coal mafia", "revenge feud", "gang war", "corruption", "multi-generational"],
        original_language="hi", release_date="2012-06-22",
        poster_url="https://image.tmdb.org/t/p/w500/rILTQRvzJwcLrBcCqeigstAuAJj.jpg",
        backdrop_url="",
        vote_average=8.4, vote_count=1150,
    ),
    MovieMetadata(
        tmdb_id=19666, title="Lagaan: Once Upon a Time in India",
        overview="The people of a small village in Victorian India stake their future on a game of cricket against their ruthless British rulers.",
        genres=["Adventure", "Drama", "Musical"], director="Ashutosh Gowariker",
        cast=["Aamir Khan", "Gracy Singh", "Rachel Shelley", "Paul Blackthorne"],
        keywords=["cricket match", "colonial oppression", "village unity", "monsoon tax", "patriotism"],
        original_language="hi", release_date="2001-06-15",
        poster_url="https://image.tmdb.org/t/p/w500/amNTdE8hEQS8lzGA23j2mZfmZyH.jpg",
        backdrop_url="",
        vote_average=8.3, vote_count=1020,
    ),
    MovieMetadata(
        tmdb_id=20533, title="Swades",
        overview="A successful NASA project scientist returns to an isolated Indian village to find his childhood nanny and discovers his true purpose.",
        genres=["Drama"], director="Ashutosh Gowariker",
        cast=["Shah Rukh Khan", "Gayatri Joshi", "Kishori Ballal", "Rajesh Vivek"],
        keywords=["nasa engineer", "rural development", "social change", "belonging", "motherland"],
        original_language="hi", release_date="2004-12-17",
        poster_url="https://image.tmdb.org/t/p/w500/966hxFdZS6uTi0bB4ZT2rN0CV6h.jpg",
        backdrop_url="",
        vote_average=8.4, vote_count=980,
    ),
    MovieMetadata(
        tmdb_id=297222, title="PK",
        overview="An alien on Earth loses his communication device and embarks on a quest across India, exposing dogmas and religious hypocrisy with naive curiosity.",
        genres=["Comedy", "Drama", "Fantasy"], director="Rajkumar Hirani",
        cast=["Aamir Khan", "Anushka Sharma", "Sushant Singh Rajput", "Boman Irani"],
        keywords=["alien", "religious satire", "curiosity", "humanity", "faith"],
        original_language="hi", release_date="2014-12-19",
        poster_url="https://image.tmdb.org/t/p/w500/i9V1uuUzJFPjdXOg6knfHci8Mha.jpg",
        backdrop_url="",
        vote_average=8.2, vote_count=1200,
    ),
    MovieMetadata(
        tmdb_id=7592, title="Taare Zameen Par",
        overview="An eight-year-old boy with dyslexia is thought to be lazy and troublesome until an unconventional art teacher uncovers his hidden genius.",
        genres=["Drama", "Family"], director="Aamir Khan",
        cast=["Darsheel Safary", "Aamir Khan", "Tisca Chopra", "Vipin Sharma"],
        keywords=["dyslexia", "inspirational teacher", "childhood creativity", "parental pressure"],
        original_language="hi", release_date="2007-12-21",
        poster_url="",
        backdrop_url="",
        vote_average=8.5, vote_count=1450,
    ),
    MovieMetadata(
        tmdb_id=534780, title="Andhadhun",
        overview="A series of mysterious events change the life of a blind pianist who must now report a crime that he never actually witnessed.",
        genres=["Crime", "Mystery", "Thriller"], director="Sriram Raghavan",
        cast=["Ayushmann Khurrana", "Tabu", "Radhika Apte", "Anil Dhawan"],
        keywords=["blind pianist", "murder mystery", "black comedy", "cat and mouse", "twists"],
        original_language="hi", release_date="2018-10-05",
        poster_url="https://image.tmdb.org/t/p/w500/dy3K6hNvwE05siGgiLJcEiwgpdO.jpg",
        backdrop_url="",
        vote_average=8.3, vote_count=1300,
    ),
    MovieMetadata(
        tmdb_id=538858, title="Tumbbad",
        overview="A mythological story about a goddess who created the entire universe and the greed of humans hunting a cursed golden treasure.",
        genres=["Fantasy", "Horror", "Drama"], director="Rahi Anil Barve",
        cast=["Sohum Shah", "Jyoti Malshe", "Anita Date-Kelkar", "Ronjini Chakraborty"],
        keywords=["curse", "mythology", "greed", "monster", "hastur"],
        original_language="hi", release_date="2018-10-12",
        poster_url="https://image.tmdb.org/t/p/w500/z1xOCxw780WFJC5uCTMfCkQ4Agi.jpg",
        backdrop_url="",
        vote_average=8.3, vote_count=890,
    ),

    # --- TAMIL (ta) ---
    MovieMetadata(
        tmdb_id=648579, title="Vikram",
        overview="A high-octane action thriller investigating a series of masked vigilante killings tied to a powerful narcotics cartel.",
        genres=["Action", "Thriller", "Crime"], director="Lokesh Kanagaraj",
        cast=["Kamal Haasan", "Vijay Sethupathi", "Fahadh Faasil", "Suriya"],
        keywords=["vigilante", "drug cartel", "black ops", "undercover", "high octane"],
        original_language="ta", release_date="2022-06-03",
        poster_url="https://image.tmdb.org/t/p/w500/aqhLeieyTpTUKPOfZ3jzo2La0Mq.jpg",
        backdrop_url="",
        vote_average=8.3, vote_count=920,
    ),
    MovieMetadata(
        tmdb_id=630566, title="Kaithi",
        overview="A newly released prisoner on his way to see his daughter is enlisted by an injured cop to drive a truck of poisoned policemen to safety.",
        genres=["Action", "Thriller", "Crime"], director="Lokesh Kanagaraj",
        cast=["Karthi", "Narain", "Arjun Das", "George Maryan"],
        keywords=["single night", "prison transport", "drug ring", "father daughter", "lcu"],
        original_language="ta", release_date="2019-10-25",
        poster_url="https://image.tmdb.org/t/p/w500/2YvT3pdGngzpbAuxamTz4ZlabnT.jpg",
        backdrop_url="",
        vote_average=8.4, vote_count=850,
    ),
    MovieMetadata(
        tmdb_id=580644, title="Asuran",
        overview="A quiet farmer with a violent past goes on the run with his family after his teenage son retaliates against an arrogant upper-caste landlord.",
        genres=["Action", "Drama"], director="Vetrimaaran",
        cast=["Dhanush", "Manju Warrier", "Prakash Raj", "Pasupathy"],
        keywords=["caste oppression", "father son", "violent past", "rural justice", "farmland rights"],
        original_language="ta", release_date="2019-10-04",
        poster_url="https://image.tmdb.org/t/p/w500/d0genrZEbGYhjt48KWc2tFAzvDd.jpg",
        backdrop_url="",
        vote_average=8.5, vote_count=890,
    ),
    MovieMetadata(
        tmdb_id=885110, title="Jai Bhim",
        overview="When a tribal man is arrested and tortured on false theft charges, a brave lawyer fights for justice in court against police corruption.",
        genres=["Crime", "Drama", "Mystery"], director="T. J. Gnanavel",
        cast=["Suriya", "Lijomol Jose", "Manikandan", "Rajisha Vijayan"],
        keywords=["tribal rights", "habeas corpus", "legal battle", "police brutality", "human rights"],
        original_language="ta", release_date="2021-11-02",
        poster_url="https://image.tmdb.org/t/p/w500/hMIQiwLpBfTfe3ZbRlNx4225Mgg.jpg",
        backdrop_url="",
        vote_average=8.8, vote_count=1300,
    ),
    MovieMetadata(
        tmdb_id=467027, title="Vikram Vedha",
        overview="A ruthless police commander pursues an elusive gangster, who surrenders voluntarily and challenges the officer's rigid worldview through morality tales.",
        genres=["Action", "Crime", "Thriller"], director="Pushkar\u2013Gayathri",
        cast=["Madhavan", "Vijay Sethupathi", "Shraddha Srinath", "Varalaxmi Sarathkumar"],
        keywords=["moral ambiguity", "cat and mouse", "underworld", "cop vs gangster", "folklore twist"],
        original_language="ta", release_date="2017-07-21",
        poster_url="https://image.tmdb.org/t/p/w500/n92Ou73z2hYfHIg7XAipE9FoL6h.jpg",
        backdrop_url="",
        vote_average=8.4, vote_count=980,
    ),
    MovieMetadata(
        tmdb_id=602211, title="Master",
        overview="An alcoholic professor is sent to a juvenile school, where he clashes with a ruthless gangster who uses children for criminal activities.",
        genres=["Action", "Crime", "Drama"], director="Lokesh Kanagaraj",
        cast=["Vijay", "Vijay Sethupathi", "Malavika Mohanan", "Andrea Jeremiah"],
        keywords=["college professor", "juvenile rehabilitation", "gangster rivalry", "clash of titans"],
        original_language="ta", release_date="2021-01-13",
        poster_url="https://image.tmdb.org/t/p/w500/4n8QNNdk4BOX9Dslfbz5Dy6j1HK.jpg",
        backdrop_url="",
        vote_average=8.0, vote_count=940,
    ),
    MovieMetadata(
        tmdb_id=666277, title="Ponniyin Selvan: Part 1",
        overview="Vandiyathevan sets out to cross the Chola land to deliver a message from the Crown Prince Aditha Karikalan, amid political conspiracies brewing in the court.",
        genres=["Action", "Adventure", "Drama"], director="Mani Ratnam",
        cast=["Vikram", "Aishwarya Rai Bachchan", "Jayam Ravi", "Karthi", "Trisha"],
        keywords=["chola dynasty", "palace intrigue", "historic epic", "royal conspiracy", "ancient war"],
        original_language="ta", release_date="2022-09-30",
        poster_url="https://image.tmdb.org/t/p/w500/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
        backdrop_url="",
        vote_average=8.2, vote_count=870,
    ),
    MovieMetadata(
        tmdb_id=1075794, title="Leo",
        overview="A mild-mannered cafe owner in Himachal Pradesh becomes the target of a ruthless drug syndicate who mistake him for an estranged gangland enforcer.",
        genres=["Action", "Crime", "Thriller"], director="Lokesh Kanagaraj",
        cast=["Vijay", "Sanjay Dutt", "Arjun Sarja", "Trisha"],
        keywords=["hidden identity", "family defense", "past sins", "gang war", "snowy mountains"],
        original_language="ta", release_date="2023-10-19",
        poster_url="https://image.tmdb.org/t/p/w500/gSOVog7ydsaF1YpgAqBqnKYFGY.jpg",
        backdrop_url="",
        vote_average=8.1, vote_count=910,
    ),
    MovieMetadata(
        tmdb_id=976573, title="Jailer",
        overview="A retired jailer goes on a man-hunt to avenge the death of his son and stop a smuggling empire.",
        genres=["Action", "Crime", "Comedy"], director="Nelson Dilipkumar",
        cast=["Rajinikanth", "Vinayakan", "Ramya Krishnan", "Vasanth Ravi"],
        keywords=["retired warden", "secret past", "antique smuggling", "revenge", "stylish action"],
        original_language="ta", release_date="2023-08-10",
        poster_url="https://image.tmdb.org/t/p/w500/4Y1WNkd88JXmGfhtWR7dmDAo1T2.jpg",
        backdrop_url="",
        vote_average=8.1, vote_count=890,
    ),
    MovieMetadata(
        tmdb_id=553592, title="Super Deluxe",
        overview="An unfaithful wife, an estranged father, a priest and an angry boy find themselves in the most unexpected predicaments on an eventful day in Chennai.",
        genres=["Crime", "Drama", "Comedy"], director="Thiagarajan Kumararaja",
        cast=["Vijay Sethupathi", "Fahadh Faasil", "Samantha Ruth Prabhu", "Ramya Krishnan"],
        keywords=["intertwined lives", "transgender parent", "alien encounter", "morality", "black comedy"],
        original_language="ta", release_date="2019-03-29",
        poster_url="https://image.tmdb.org/t/p/w500/peYRpielBbRHMGNYJnWyCsG7apA.jpg",
        backdrop_url="",
        vote_average=8.5, vote_count=820,
    ),

    # --- MALAYALAM (ml) ---
    MovieMetadata(
        tmdb_id=1196420, title="Manjummel Boys",
        overview="A group of friends from a small town embark on a vacation to Guna Caves, where an unexpected mishap tests their unbreakable bond of brotherhood.",
        genres=["Adventure", "Drama", "Thriller"], director="Chidambaram",
        cast=["Soubin Shahir", "Sreenath Bhasi", "Balu Varghese", "Ganapathi"],
        keywords=["guna caves", "survival", "friendship", "rescue mission", "true story"],
        original_language="ml", release_date="2024-02-22",
        poster_url="https://image.tmdb.org/t/p/w500/kUMcgpitxUwFi6Cr8DIxFJxGake.jpg",
        backdrop_url="",
        vote_average=8.5, vote_count=810,
    ),
    MovieMetadata(
        tmdb_id=579893, title="Kumbalangi Nights",
        overview="Four brothers share a love-hate relationship with each other in a dilapidated home in Kumbalangi. Their relationship matures as they face personal challenges.",
        genres=["Comedy", "Drama", "Romance"], director="Madhu C. Narayanan",
        cast=["Soubin Shahir", "Shane Nigam", "Fahadh Faasil", "Sreenath Bhasi"],
        keywords=["brotherhood", "backwaters", "toxic masculinity", "love", "family healing"],
        original_language="ml", release_date="2019-02-07",
        poster_url="https://image.tmdb.org/t/p/w500/wqapyNtpttQsJ0WMNfILvtWQl48.jpg",
        backdrop_url="",
        vote_average=8.6, vote_count=790,
    ),
    MovieMetadata(
        tmdb_id=219968, title="Drishyam",
        overview="A family man goes to extreme lengths to protect his family from the law after they accidentally commit an unexpected crime.",
        genres=["Crime", "Drama", "Thriller"], director="Jeethu Joseph",
        cast=["Mohanlal", "Meena", "Ansiba", "Esther Anil", "Asha Sharath"],
        keywords=["perfect alibi", "cable operator", "police interrogation", "family protection", "cinema knowledge"],
        original_language="ml", release_date="2013-12-19",
        poster_url="",
        backdrop_url="",
        vote_average=8.8, vote_count=1200,
    ),
    MovieMetadata(
        tmdb_id=1229061, title="Premalu",
        overview="Sachin pursues romance in Hyderabad while navigating career struggles and unrequited feelings in this lighthearted modern romantic comedy.",
        genres=["Comedy", "Romance"], director="Girish A.D.",
        cast=["Naslen K. Gafoor", "Mamitha Baiju", "Shyam Mohan", "Sangeeth Prathap"],
        keywords=["hyderabad life", "modern romance", "friendship", "youth humor", "feel good"],
        original_language="ml", release_date="2024-02-09",
        poster_url="https://image.tmdb.org/t/p/w500/fO5URBe0NmXrcbSYJ34TyUDsDiz.jpg",
        backdrop_url="",
        vote_average=8.3, vote_count=740,
    ),
    MovieMetadata(
        tmdb_id=1139829, title="Aavesham",
        overview="Three engineering students in Bangalore look for local gangsters to help them seek revenge on senior bullies, befriending an eccentric don named Ranga.",
        genres=["Action", "Comedy"], director="Jithu Madhavan",
        cast=["Fahadh Faasil", "Hipzster", "Mithun Jai Shankar", "Roshan Shanavas"],
        keywords=["bangalore college", "eccentric don", "ragging revenge", "party anthem", "chaos"],
        original_language="ml", release_date="2024-04-11",
        poster_url="https://image.tmdb.org/t/p/w500/N2ddXhBX5kqwA9flbm2yqFtX6b.jpg",
        backdrop_url="",
        vote_average=8.4, vote_count=820,
    ),
    MovieMetadata(
        tmdb_id=581299, title="Lucifer",
        overview="A political godfather dies and a lot of thieves dressed in white enter the arena, but an enigmatic operative named Stephen Nedumpally emerges to take control.",
        genres=["Action", "Crime", "Drama"], director="Prithviraj Sukumaran",
        cast=["Mohanlal", "Vivek Oberoi", "Manju Warrier", "Tovino Thomas"],
        keywords=["political thriller", "hidden identity", "drug cartel", "mass elevation", "godfather"],
        original_language="ml", release_date="2019-03-28",
        poster_url="https://image.tmdb.org/t/p/w500/rgJeoUj2XFlkBBGGmTANob0VIRW.jpg",
        backdrop_url="",
        vote_average=8.2, vote_count=780,
    ),
    MovieMetadata(
        tmdb_id=270946, title="Bangalore Days",
        overview="Three cousins fulfill their childhood dream of relocating to Bangalore together, navigating love, marital challenges, and personal passions.",
        genres=["Comedy", "Drama", "Romance"], director="Anjali Menon",
        cast=["Dulquer Salmaan", "Nivin Pauly", "Nazriya Nazim", "Fahadh Faasil"],
        keywords=["cousins", "city life", "motocross", "coming of age", "true friendship"],
        original_language="ml", release_date="2014-05-30",
        poster_url="https://image.tmdb.org/t/p/w500/dXbpNrPDZDMEbujFoOxmMNQVMHa.jpg",
        backdrop_url="",
        vote_average=8.5, vote_count=870,
    ),
    MovieMetadata(
        tmdb_id=340102, title="Premam",
        overview="George experiences romance, heartbreak, and emotional maturity at three different stages of his life in Kerala.",
        genres=["Comedy", "Drama", "Romance"], director="Alphonse Puthren",
        cast=["Nivin Pauly", "Sai Pallavi", "Madonna Sebastian", "Anupama Parameswaran"],
        keywords=["stages of love", "college romance", "malare", "nostalgia", "growth"],
        original_language="ml", release_date="2015-05-29",
        poster_url="https://image.tmdb.org/t/p/w500/xiDGcXJTvu1lazFRYip6g1eLt9c.jpg",
        backdrop_url="",
        vote_average=8.5, vote_count=890,
    ),
    MovieMetadata(
        tmdb_id=811367, title="Joji",
        overview="An engineering dropout and the youngest son of a wealthy plantation family is driven by blind ambition after an unexpected event in the family.",
        genres=["Crime", "Drama"], director="Dileesh Pothan",
        cast=["Fahadh Faasil", "Baburaj", "Shammi Thilakan", "Unnimaya Prasad"],
        keywords=["macbeth adaptation", "family greed", "isolation", "psychological crime"],
        original_language="ml", release_date="2021-04-07",
        poster_url="https://image.tmdb.org/t/p/w500/32vLDKSzcCMh55zqqaSqqUA8naz.jpg",
        backdrop_url="",
        vote_average=8.2, vote_count=730,
    ),
    MovieMetadata(
        tmdb_id=734309, title="Minnal Murali",
        overview="A small-town tailor gains superpowers after being struck by lightning, having to confront an unexpected adversary with equal abilities.",
        genres=["Action", "Adventure", "Comedy"], director="Basil Joseph",
        cast=["Tovino Thomas", "Guru Somasundaram", "Aju Varghese", "Femina George"],
        keywords=["superhero origin", "lightning strike", "village community", "cape and mask"],
        original_language="ml", release_date="2021-12-24",
        poster_url="https://image.tmdb.org/t/p/w500/9Rj8l6gElLpRL7Kj17iZhrT5Zuw.jpg",
        backdrop_url="",
        vote_average=8.3, vote_count=840,
    ),

    # --- KANNADA (kn) ---
    MovieMetadata(
        tmdb_id=994146, title="Kantara",
        overview="When greed paves the way for betrayal and wrath, a young man from an indigenous community rises to protect his village forest and sacred traditions.",
        genres=["Action", "Adventure", "Drama"], director="Rishab Shetty",
        cast=["Rishab Shetty", "Sapthami Gowda", "Kishore Kumar G.", "Achyuth Kumar"],
        keywords=["folklore", "demigod", "forest land", "sacred ritual", "tribal rights"],
        original_language="kn", release_date="2022-09-30",
        poster_url="https://image.tmdb.org/t/p/w500/gOjhzAI68DK0AsIkwht2MiB3cR3.jpg",
        backdrop_url="",
        vote_average=8.4, vote_count=870,
    ),
    MovieMetadata(
        tmdb_id=554605, title="K.G.F: Chapter 1",
        overview="In the 1970s, a fierce rebel named Rocky rises from the slums of Bombay to liberate the enslaved miners of the Kolar Gold Fields.",
        genres=["Action", "Crime", "Drama"], director="Prashanth Neel",
        cast=["Yash", "Srinidhi Shetty", "Ramachandra Raju", "Anant Nag"],
        keywords=["gold mines", "slums of bombay", "rebellion", "underworld empire", "mass elevation"],
        original_language="kn", release_date="2018-12-21",
        poster_url="https://image.tmdb.org/t/p/w500/4D38zBifm3vrZ7UNYX4rISsPcJt.jpg",
        backdrop_url="",
        vote_average=8.5, vote_count=1200,
    ),
    MovieMetadata(
        tmdb_id=586940, title="K.G.F: Chapter 2",
        overview="The blood-soaked land of Kolar Gold Fields now has a new overlord in Rocky, whose name strikes fear into his foes while facing government forces and rivals.",
        genres=["Action", "Crime", "Drama"], director="Prashanth Neel",
        cast=["Yash", "Sanjay Dutt", "Raveena Tandon", "Srinidhi Shetty"],
        keywords=["prime minister", "adheera", "monopoly", "epic climax", "empire"],
        original_language="kn", release_date="2022-04-14",
        poster_url="https://image.tmdb.org/t/p/w500/z5dXCywyo8zEPNDkeQY7nbvkrz8.jpg",
        backdrop_url="",
        vote_average=8.6, vote_count=1350,
    ),
    MovieMetadata(
        tmdb_id=776821, title="777 Charlie",
        overview="Dharma, an introverted factory worker trapped in a lonely, monotonous routine, finds renewed purpose when an abandoned Labrador puppy enters his life.",
        genres=["Adventure", "Comedy", "Drama"], director="Kiranraj K",
        cast=["Rakshit Shetty", "Charlie", "Sangeetha Sringeri", "Raj B. Shetty"],
        keywords=["dog bond", "road trip to himalayas", "loneliness", "redemption", "heartwarming"],
        original_language="kn", release_date="2022-06-10",
        poster_url="https://image.tmdb.org/t/p/w500/qrq7sGXraFM6H9OcHFKQTKe8A3f.jpg",
        backdrop_url="",
        vote_average=8.8, vote_count=890,
    ),
    MovieMetadata(
        tmdb_id=220677, title="Lucia",
        overview="An usher suffering from insomnia is tricked into taking an experimental drug that causes him to experience his dream life as a famous movie star.",
        genres=["Drama", "Psychological Thriller", "Science Fiction"], director="Pawan Kumar",
        cast=["Sathish Ninasam", "Sruthi Hariharan", "Achyuth Kumar"],
        keywords=["insomnia pills", "dream within dream", "celebrity illusion", "non linear"],
        original_language="kn", release_date="2013-09-06",
        poster_url="https://image.tmdb.org/t/p/w500/YxZ66KLrlq02npTKqaTBqz7AN0.jpg",
        backdrop_url="",
        vote_average=8.4, vote_count=760,
    ),
    MovieMetadata(
        tmdb_id=395026, title="U-Turn",
        overview="An investigative journalist researching traffic rule violations on a Bangalore flyover finds herself framed for murder when motorists start dying.",
        genres=["Mystery", "Thriller"], director="Pawan Kumar",
        cast=["Shraddha Srinath", "Roger Narayan", "Radhika Chetan", "Dilip Raj"],
        keywords=["flyover mystery", "investigative journalism", "supernatural twist", "interrogation"],
        original_language="kn", release_date="2016-05-20",
        poster_url="https://image.tmdb.org/t/p/w500/6CcXydsrQMSKjj4xNfT81ioL4TM.jpg",
        backdrop_url="",
        vote_average=8.2, vote_count=710,
    ),
    MovieMetadata(
        tmdb_id=258842, title="Ulidavaru Kandanthe",
        overview="A journalist investigates a fatal confrontation during a coastal festival from five different perspectives, each revealing a new layer of truth.",
        genres=["Crime", "Drama", "Mystery"], director="Rakshit Shetty",
        cast=["Rakshit Shetty", "Kishore", "Tara", "Achyuth Kumar"],
        keywords=["rashomon style", "coastal karnataka", "tiger dance", "gang feud", "perspectives"],
        original_language="kn", release_date="2014-03-28",
        poster_url="https://image.tmdb.org/t/p/w500/jQ8HGtgAdObDR5ZHXHtQPUMbNEW.jpg",
        backdrop_url="",
        vote_average=8.5, vote_count=780,
    ),
    MovieMetadata(
        tmdb_id=427514, title="Kirik Party",
        overview="A gang of mischievous engineering students make memories, fall in love, and face an emotional turning point that changes their lives forever.",
        genres=["Comedy", "Drama", "Romance"], director="Rishab Shetty",
        cast=["Rakshit Shetty", "Rashmika Mandanna", "Samyuktha Hegde", "Achyuth Kumar"],
        keywords=["college gang", "campus romance", "nostalgia", "growth", "engineering days"],
        original_language="kn", release_date="2016-12-30",
        poster_url="https://image.tmdb.org/t/p/w500/gc4ax2l8Wf668Ae2Hg1E5ivh1Ne.jpg",
        backdrop_url="",
        vote_average=8.4, vote_count=820,
    ),
    MovieMetadata(
        tmdb_id=892305, title="Garuda Gamana Vrishabha Vahana",
        overview="Two childhood friends grow up to control the underworld of Mangalore as Shiva and Hari, until their contrasting temperaments breed fatal suspicion.",
        genres=["Crime", "Drama", "Thriller"], director="Raj B. Shetty",
        cast=["Raj B. Shetty", "Rishab Shetty", "Gopalkrishna Deshpande"],
        keywords=["mangalore underworld", "mythological duality", "loyalty and betrayal", "gritty realism"],
        original_language="kn", release_date="2021-11-19",
        poster_url="https://image.tmdb.org/t/p/w500/6Wc7DYvFuKhwTjolLB2PkpX6MQk.jpg",
        backdrop_url="",
        vote_average=8.6, vote_count=790,
    ),
    MovieMetadata(
        tmdb_id=352467, title="RangiTaranga",
        overview="An enigmatic novelist and his wife move to an ancestral village in coastal Karnataka, where strange unexplainable events begin threatening them.",
        genres=["Mystery", "Thriller"], director="Anup Bhandari",
        cast=["Nirup Bhandari", "Radhika Chetan", "Avantika Shetty", "Sai Kumar"],
        keywords=["yakshagana folklore", "ancestral house", "missing person", "rainy mystery"],
        original_language="kn", release_date="2015-07-03",
        poster_url="",
        backdrop_url="",
        vote_average=8.3, vote_count=750,
    ),

    # --- ENGLISH (en) ---
    MovieMetadata(
        tmdb_id=27205, title="Inception",
        overview="A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
        genres=["Action", "Science Fiction", "Adventure"], director="Christopher Nolan",
        cast=["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page", "Tom Hardy"],
        keywords=["subconscious", "dreams", "heist", "reality manipulation", "mind bending"],
        original_language="en", release_date="2010-07-15",
        poster_url="https://image.tmdb.org/t/p/w500/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg",
        backdrop_url="",
        vote_average=8.8, vote_count=35000,
    ),
    MovieMetadata(
        tmdb_id=157336, title="Interstellar",
        overview="A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        genres=["Adventure", "Drama", "Science Fiction"], director="Christopher Nolan",
        cast=["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain", "Michael Caine"],
        keywords=["space travel", "black hole", "relativity", "father daughter", "time dilation"],
        original_language="en", release_date="2014-11-05",
        poster_url="https://image.tmdb.org/t/p/w500/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg",
        backdrop_url="",
        vote_average=8.7, vote_count=34000,
    ),
    MovieMetadata(
        tmdb_id=872585, title="Oppenheimer",
        overview="The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
        genres=["Drama", "History", "Biography"], director="Christopher Nolan",
        cast=["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr."],
        keywords=["manhattan project", "nuclear physics", "moral dilemma", "trinity test", "cold war"],
        original_language="en", release_date="2023-07-19",
        poster_url="https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
        backdrop_url="",
        vote_average=8.9, vote_count=14500,
    ),
    MovieMetadata(
        tmdb_id=155, title="The Dark Knight",
        overview="Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent until a sadistic criminal mastermind named the Joker plunges Gotham into anarchy.",
        genres=["Drama", "Action", "Crime", "Thriller"], director="Christopher Nolan",
        cast=["Christian Bale", "Heath Ledger", "Aaron Eckhart", "Michael Caine"],
        keywords=["joker", "gotham city", "vigilante", "moral corruption", "chaos"],
        original_language="en", release_date="2008-07-16",
        poster_url="https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        backdrop_url="",
        vote_average=9.0, vote_count=32000,
    ),
    MovieMetadata(
        tmdb_id=680, title="Pulp Fiction",
        overview="The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
        genres=["Crime", "Drama", "Thriller"], director="Quentin Tarantino",
        cast=["John Travolta", "Samuel L. Jackson", "Uma Thurman", "Bruce Willis"],
        keywords=["hitman", "dialogue", "los angeles", "nonlinear timeline", "briefcase"],
        original_language="en", release_date="1994-09-10",
        poster_url="https://image.tmdb.org/t/p/w500/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg",
        backdrop_url="",
        vote_average=8.9, vote_count=27000,
    ),
    MovieMetadata(
        tmdb_id=550, title="Fight Club",
        overview="An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.",
        genres=["Drama", "Thriller"], director="David Fincher",
        cast=["Edward Norton", "Brad Pitt", "Helena Bonham Carter", "Meat Loaf"],
        keywords=["alter ego", "consumerism", "underground fight", "insomnia", "anarchism"],
        original_language="en", release_date="1999-10-15",
        poster_url="https://image.tmdb.org/t/p/w500/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg",
        backdrop_url="",
        vote_average=8.8, vote_count=28000,
    ),
    MovieMetadata(
        tmdb_id=13, title="Forrest Gump",
        overview="The history of the United States from the 1950s to the '70s unfolds from the perspective of an Alabama man with an IQ of 75.",
        genres=["Comedy", "Drama", "Romance"], director="Robert Zemeckis",
        cast=["Tom Hanks", "Robin Wright", "Gary Sinise", "Sally Field"],
        keywords=["running", "vietnam war", "innocence", "ping pong", "destiny"],
        original_language="en", release_date="1994-06-23",
        poster_url="https://image.tmdb.org/t/p/w500/Cw4hIUIAmSYfK9QfaUW5igp9La.jpg",
        backdrop_url="",
        vote_average=8.8, vote_count=26000,
    ),
    MovieMetadata(
        tmdb_id=603, title="The Matrix",
        overview="Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.",
        genres=["Action", "Science Fiction"], director="Lana Wachowski",
        cast=["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss", "Hugo Weaving"],
        keywords=["simulation", "cyberpunk", "bullet time", "rebellion", "the one"],
        original_language="en", release_date="1999-03-30",
        poster_url="https://image.tmdb.org/t/p/w500/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg",
        backdrop_url="",
        vote_average=8.7, vote_count=24500,
    ),

    # --- KOREAN (ko) ---
    MovieMetadata(
        tmdb_id=496243, title="Parasite",
        overview="All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.",
        genres=["Comedy", "Thriller", "Drama"], director="Bong Joon-ho",
        cast=["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong", "Choi Woo-shik"],
        keywords=["class conflict", "deception", "wealth disparity", "dark comedy", "basement"],
        original_language="ko", release_date="2019-05-30",
        poster_url="https://image.tmdb.org/t/p/w500/igICOruFgiqdY1HXwTNRuXJute.jpg",
        backdrop_url="",
        vote_average=8.5, vote_count=17500,
    ),

    # --- JAPANESE (ja) ---
    MovieMetadata(
        tmdb_id=129, title="Spirited Away",
        overview="A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon the courage she never knew she had to free her family.",
        genres=["Animation", "Family", "Fantasy"], director="Hayao Miyazaki",
        cast=["Rumi Hiiragi", "Miyu Irino", "Mari Natsuki", "Takashi Naito"],
        keywords=["bathhouse", "spirit world", "courage", "witch", "studio ghibli"],
        original_language="ja", release_date="2001-07-20",
        poster_url="https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
        backdrop_url="",
        vote_average=8.5, vote_count=16000,
    ),
]


class TMDBService:
    def __init__(self):
        self.base_url = settings.TMDB_BASE_URL
        self.image_base_url = settings.TMDB_IMAGE_BASE_URL
        self.api_key = settings.TMDB_API_KEY
        self.read_token = settings.TMDB_READ_ACCESS_TOKEN
        
        self.headers = {"User-Agent": "FilmMatch-AI/1.0"}
        if self.read_token:
            self.headers["Authorization"] = f"Bearer {self.read_token}"

        # Simple In-Memory TTL Cache: key -> (timestamp, ttl, data)
        self._cache: dict[str, tuple[float, float, Any]] = {}
        self._cache_ttl_seconds = 300.0  # 5 minutes default

    async def _request(self, endpoint: str, params: Optional[dict] = None,
                       force_refresh: bool = False, ttl: float = 300.0,
                       allow_stale: bool = True) -> dict:
        """Cache only successful TMDB responses, including genuine empty results.

        Last-known-good responses may survive transient failures for at most one
        hour from their original fetch, never from the time they were reused.
        """
        import json
        key = endpoint + ":" + json.dumps(params or {}, sort_keys=True)
        cached = self._cache.get(key)
        if cached and not force_refresh and time.time() - cached[0] < cached[1]:
            record(endpoint=endpoint, source="tmdb", cache="cached", fetched_at=timestamp(cached[0]))
            return cached[2]

        failure = None
        if not (self.api_key or self.read_token):
            failure = TMDBFailure("tmdb_not_configured", "TMDB credentials are not configured.")
        else:
            try:
                async with httpx.AsyncClient(headers=self.headers, timeout=10.0 if endpoint == "/trending/movie/day" else 2.0) as client:
                    response = await client.get(f"{self.base_url}{endpoint}", params=self._get_params(params))
                if response.status_code != 200:
                    raise TMDBFailure("tmdb_http_error", "TMDB request failed.", response.status_code)
                data = response.json()
                if not isinstance(data, dict):
                    raise ValueError("Invalid response")
                is_list = endpoint in ("/search/movie", "/discover/movie", "/trending/movie/day") or endpoint.endswith(("/reviews", "/recommendations", "/similar"))
                if is_list and (not isinstance(data.get("results"), list) or any(not isinstance(item, dict) for item in data["results"])):
                    raise ValueError("Invalid results")
                if is_list and not endpoint.endswith("/reviews"):
                    # Reject malformed movie pages before they can replace good cache data.
                    if any(not isinstance(m.get("id"), int) or not isinstance(m.get("title"), str) or not m["title"] for m in data["results"]):
                        raise ValueError("Invalid movie list")
                    self._map_raw_to_search_items(data["results"])
                if endpoint == "/configuration" and not isinstance(data.get("images"), dict):
                    raise ValueError("Invalid configuration")
                if endpoint.startswith("/movie/") and not is_list:
                    if not isinstance(data.get("id"), int) or not isinstance(data.get("title"), str):
                        raise ValueError("Invalid movie")
                    float(data.get("vote_average") or 0)
                    int(data.get("vote_count") or 0)
                    for name in ("credits", "keywords"):
                        if data.get(name) is not None and not isinstance(data[name], dict):
                            raise ValueError("Invalid metadata")
                    groups = [data.get("genres", []), (data.get("credits") or {}).get("cast", []),
                              (data.get("credits") or {}).get("crew", []),
                              (data.get("keywords") or {}).get("keywords", [])]
                    if any(not isinstance(group, list) or any(not isinstance(item, dict) for item in group) for group in groups):
                        raise ValueError("Invalid metadata lists")
                now = time.time()
                if len(self._cache) >= 1000 and key not in self._cache:
                    oldest = min(self._cache, key=lambda item: self._cache[item][0])
                    del self._cache[oldest]
                self._cache[key] = (now, ttl, data)
                record(endpoint=endpoint, source="tmdb", cache="fresh", fetched_at=timestamp(now))
                return data
            except TMDBFailure as exc:
                failure = exc
            except httpx.TimeoutException:
                failure = TMDBFailure("tmdb_timeout", "TMDB request timed out.")
            except httpx.RequestError:
                failure = TMDBFailure("tmdb_unreachable", "TMDB could not be reached.")
            except (ValueError, TypeError):
                failure = TMDBFailure("tmdb_invalid_response", "TMDB returned an invalid response.")

        transient = failure.error["code"] in ("tmdb_timeout", "tmdb_unreachable", "tmdb_invalid_response") or failure.error["upstream_status"] == 429 or (failure.error["upstream_status"] or 0) >= 500
        if allow_stale and transient and cached and time.time() - cached[0] <= 3600:
            record(endpoint=endpoint, source="tmdb", cache="stale", fetched_at=timestamp(cached[0]), error=failure.error)
            return cached[2]
        record(endpoint=endpoint, source="none", cache="none", fetched_at=None, error=failure.error)
        raise failure

    def _get_params(self, extra: Optional[dict] = None) -> dict:
        params = {}
        if self.api_key and not self.read_token:
            params["api_key"] = self.api_key
        if extra:
            params.update(extra)
        return params

    def _format_poster(self, path: Optional[str]) -> str:
        if not path or not isinstance(path, str):
            return ""
        trimmed = path.strip()
        if not trimmed:
            return ""
        if trimmed.startswith("http://") or trimmed.startswith("https://"):
            if "media.themoviedb.org" in trimmed:
                trimmed = trimmed.replace("media.themoviedb.org", "image.tmdb.org")
            return trimmed
        clean_path = trimmed if trimmed.startswith("/") else f"/{trimmed}"
        return f"{self.image_base_url}/w500{clean_path}"

    def _format_backdrop(self, path: Optional[str]) -> str:
        if not path or not isinstance(path, str):
            return ""
        trimmed = path.strip()
        if not trimmed:
            return ""
        if trimmed.startswith("http://") or trimmed.startswith("https://"):
            if "media.themoviedb.org" in trimmed:
                trimmed = trimmed.replace("media.themoviedb.org", "image.tmdb.org")
            return trimmed
        clean_path = trimmed if trimmed.startswith("/") else f"/{trimmed}"
        return f"{self.image_base_url}/w1280{clean_path}"

    def _map_raw_to_search_items(self, results: list[dict], preserve_order: bool = False) -> list[MovieSearchItem]:
        items = []
        for m in results:
            if not m.get("id") or not m.get("title"):
                continue
            genre_ids = m.get("genre_ids", [])
            genres = [TMDB_GENRES.get(gid, "Drama") for gid in genre_ids if gid in TMDB_GENRES]
            poster_path = m.get("poster_path")
            backdrop_path = m.get("backdrop_path")
            items.append(MovieSearchItem(
                tmdb_id=m["id"],
                title=m.get("title", ""),
                release_date=m.get("release_date", ""),
                original_language=m.get("original_language", "en"),
                poster_url=self._format_poster(poster_path),
                poster_path=poster_path if isinstance(poster_path, str) else None,
                backdrop_url=self._format_backdrop(backdrop_path),
                backdrop_path=backdrop_path if isinstance(backdrop_path, str) else None,
                vote_average=round(float(m.get("vote_average", 0.0)), 1),
                overview=m.get("overview", ""),
                genres=genres
            ))
        if not preserve_order:
            # Sort: movies with posters first, then by vote_average descending
            items.sort(key=lambda x: (0 if x.poster_url else 1, -x.vote_average))
        return items

    def _fallback_search(self, query: str) -> list[MovieSearchItem]:
        if not query or not query.strip():
            return []

        q_clean = query.strip().lower()
        q_norm = re.sub(r"[^\w\s]", "", q_clean)

        matches = []
        for m in OFFLINE_CATALOG:
            title_clean = m.title.lower()
            title_norm = re.sub(r"[^\w\s]", "", title_clean)
            
            # Match against title, normalized title, genres, cast, director, or keywords
            if (
                q_clean in title_clean
                or (q_norm and q_norm in title_norm)
                or any(q_clean in g.lower() for g in m.genres)
                or any(q_clean in c.lower() for c in m.cast)
                or q_clean in m.director.lower()
                or any(q_clean in k.lower() for k in m.keywords)
            ):
                matches.append(m)

        # CRITICAL: If no matches found, return empty list (never return unrelated fallback movies)
        if not matches:
            return []

        # Sort exact title matches first, then by vote average
        matches.sort(
            key=lambda m: (
                0 if q_clean == m.title.lower() or (q_norm and q_norm == re.sub(r"[^\w\s]", "", m.title.lower())) else 1,
                -m.vote_average
            )
        )

        return [
            MovieSearchItem(
                tmdb_id=m.tmdb_id,
                title=m.title,
                release_date=m.release_date,
                original_language=m.original_language,
                poster_url=m.poster_url,
                backdrop_url=m.backdrop_url,
                vote_average=m.vote_average,
                overview=m.overview,
                genres=m.genres
            )
            for m in matches
        ]

    async def search_movies(self, query: str, page: int = 1) -> list[MovieSearchItem]:
        if not query or not query.strip():
            return []
        if is_demo():
            record(endpoint="/search/movie", source="offline_demo", cache="none", fetched_at=None)
            return self._fallback_search(query)
        data = await self._request("/search/movie", {"query": query.strip(), "include_adult": "false", "page": page})
        return self._map_raw_to_search_items(data["results"])

    async def discover_movies(
        self,
        language: Optional[str] = None,
        genre_id: Optional[int] = None,
        sort_by: str = "popularity.desc",
        page: int = 1,
    ) -> list[MovieSearchItem]:
        """
        Discovers movies dynamically from TMDB with regional language filtering.
        Supports Telugu, Hindi, Tamil, Malayalam, Kannada, Global, and All categories.
        """
        if not is_demo():
            extra_params: dict = {
                "sort_by": sort_by, "include_adult": "false",
                "vote_count.gte": "5", "page": page,
            }
            if language and language not in ("all", "global"):
                extra_params["with_original_language"] = language
            elif language == "global":
                extra_params["without_original_language"] = "te,hi,ta,ml,kn"
            if genre_id:
                extra_params["with_genres"] = str(genre_id)
            data = await self._request("/discover/movie", extra_params)
            return self._map_raw_to_search_items(data["results"])

        record(endpoint="/discover/movie", source="offline_demo", cache="none", fetched_at=None)
        # Explicit demo: existing balanced showcase, never a live failure fallback.
        if not language or language == "all":
            # Distinct balanced multi-regional discovery showcase:
            # Round-robin top-rated films from Telugu, Hindi, Tamil, Malayalam, Kannada, Global
            languages = ["te", "hi", "ta", "ml", "kn", "global"]
            lang_groups = {}
            for lang_code in languages:
                if lang_code == "global":
                    group = [m for m in OFFLINE_CATALOG if m.original_language not in ["te", "hi", "ta", "ml", "kn"]]
                else:
                    group = [m for m in OFFLINE_CATALOG if m.original_language == lang_code]
                group.sort(key=lambda m: (0 if (m.poster_url and m.poster_url.strip()) else 1, -m.vote_average))
                lang_groups[lang_code] = group

            interleaved = []
            max_len = max(len(g) for g in lang_groups.values())
            for idx in range(max_len):
                for lang_code in languages:
                    if idx < len(lang_groups[lang_code]):
                        interleaved.append(lang_groups[lang_code][idx])

            items = [
                MovieSearchItem(
                    tmdb_id=m.tmdb_id,
                    title=m.title,
                    release_date=m.release_date,
                    original_language=m.original_language,
                    poster_url=m.poster_url,
                    backdrop_url=m.backdrop_url,
                    vote_average=m.vote_average,
                    overview=m.overview,
                    genres=m.genres
                )
                for m in interleaved
            ]
            return items

        filtered_catalog = sorted(
            [
                m for m in OFFLINE_CATALOG
                if (language == "global" and m.original_language not in ["te", "hi", "ta", "ml", "kn"])
                or (m.original_language == language)
            ],
            key=lambda m: (0 if (m.poster_url and m.poster_url.strip()) else 1, -m.vote_average)
        )

        items = [
            MovieSearchItem(
                tmdb_id=m.tmdb_id,
                title=m.title,
                release_date=m.release_date,
                original_language=m.original_language,
                poster_url=m.poster_url,
                backdrop_url=m.backdrop_url,
                vote_average=m.vote_average,
                overview=m.overview,
                genres=m.genres
            )
            for m in filtered_catalog
        ]
        return items

    async def get_trending_movies(
        self, language: Optional[str] = None, page: int = 1, force_refresh: bool = False
    ) -> list[MovieSearchItem]:
        """Return official daily trending, never demo or popularity rankings.

        Language filters select from the requested TMDB trending page, preserving
        relative rank. Sparse/empty selections are not backfilled from discovery.
        The shared request helper retains Phase 1 cache, provenance and failures.
        """
        data = await self._request("/trending/movie/day", {"page": page}, force_refresh=force_refresh, ttl=600.0)
        items = self._map_raw_to_search_items(data["results"], preserve_order=True)
        if language == "global":
            return [m for m in items if m.original_language not in REGIONAL_LANGUAGES]
        if language and language != "all":
            return [m for m in items if m.original_language == language]
        return items

    async def get_movie_details(self, tmdb_id: int) -> Optional[MovieMetadata]:
        if is_demo():
            record(endpoint=f"/movie/{tmdb_id}", source="offline_demo", cache="none", fetched_at=None)
            return next((m for m in OFFLINE_CATALOG if m.tmdb_id == tmdb_id), None)
        try:
            data = await self._request(f"/movie/{tmdb_id}", {"append_to_response": "credits,keywords"})
        except TMDBFailure as exc:
            if exc.error["upstream_status"] == 404:
                return None
            raise
        credits = data.get("credits") or {}
        keywords_data = data.get("keywords") or {}
        keywords_list = keywords_data.get("keywords", []) or keywords_data.get("results", [])
        return MovieMetadata(
            tmdb_id=data["id"], title=data.get("title") or "", overview=data.get("overview") or "",
            genres=[g["name"] for g in data.get("genres", []) if g.get("name")],
            director=next((c.get("name", "") for c in credits.get("crew", []) if c.get("job") == "Director"), ""),
            cast=[a["name"] for a in credits.get("cast", [])[:5] if a.get("name")],
            keywords=[kw["name"] for kw in keywords_list if kw.get("name")],
            original_language=data.get("original_language") or "en", release_date=data.get("release_date") or "",
            poster_url=self._format_poster(data.get("poster_path")), backdrop_url=self._format_backdrop(data.get("backdrop_path")),
            vote_average=round(float(data.get("vote_average") or 0), 1), vote_count=int(data.get("vote_count") or 0),
        )

    async def get_movie_reviews(self, tmdb_id: int) -> list[str]:
        endpoint = f"/movie/{tmdb_id}/reviews"
        if is_demo():
            record(endpoint=endpoint, source="offline_demo", cache="none", fetched_at=None)
            return []
        try:
            data = await self._request(endpoint, {"page": 1})
            return [r["content"] for r in data["results"] if isinstance(r.get("content"), str) and r["content"]]
        except TMDBFailure:
            # Sentiment fallback is part of the existing engine. The failed
            # review request remains visible in the response provenance.
            return []

    async def get_candidate_pool(self, source_movie: MovieMetadata) -> list[MovieMetadata]:
        """
        Builds a rich, diverse candidate pool of related movies.
        """
        if is_demo():
            record(endpoint="demo/candidates", source="offline_demo", cache="none", fetched_at=None)
            return [m for m in OFFLINE_CATALOG if m.tmdb_id != source_movie.tmdb_id]
        candidate_ids: set[int] = set()
        failures = []
        for kind in ("recommendations", "similar"):
            try:
                data = await self._request(f"/movie/{source_movie.tmdb_id}/{kind}")
                candidate_ids.update(m["id"] for m in data["results"] if m.get("id") and m["id"] != source_movie.tmdb_id)
            except TMDBFailure as exc:
                failures.append(exc)
        candidates = await asyncio.gather(*[self.get_movie_details(mid) for mid in list(candidate_ids)[:45]], return_exceptions=True)
        valid = [m for m in candidates if isinstance(m, MovieMetadata) and m.tmdb_id != source_movie.tmdb_id]
        failures.extend(m for m in candidates if isinstance(m, TMDBFailure))
        unexpected = next((m for m in candidates if isinstance(m, Exception) and not isinstance(m, TMDBFailure)), None)
        if unexpected:
            raise unexpected
        if not valid and failures:
            raise failures[0]
        # Partial live results are useful; never replace them with demo films.
        return valid

    async def get_candidate_reviews_map(
        self, candidate_ids: list[int]
    ) -> dict[int, list[str]]:
        """Fetch audience reviews for candidates."""
        tasks = [self.get_movie_reviews(m_id) for m_id in candidate_ids]
        reviews_lists = await asyncio.gather(*tasks)
        return dict(zip(candidate_ids, reviews_lists))
