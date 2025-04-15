const taglines = [
    "Bid Now. Win Big.",
    "Secure Payments. Trusted Sellers.",
    "Live Auctions Every Hour.",
    "Place Smart Bids. Win Smarter.",
    "Fast Bidding. Fair Prices."
  ];
  
  let i = 0;
  setInterval(() => {
    const taglineElement = document.getElementById("tagline");
    i = (i + 1) % taglines.length;
    taglineElement.textContent = taglines[i];
  }, 3000);
  