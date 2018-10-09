pa("create", "mytracker", "/ws/pa");
pa("provide", "eventTracker", EventTracker);
pa("provide", "outboundLinkTracker", OutboundLinkTracker);
pa("provide", "impressionTracker", ImpressionTracker);
pa("provide", "cleanUrlTracker", CleanUrlTracker);
pa("require", "eventTracker", {
	"attributePrefix": "data-pa-"
});
pa("set", {'engage_account_id':'$accountid','temporality':'$temporality','member_type':'$memberType'});
pa("require", "outboundLinkTracker");
pa("require", "impressionTracker", {attributePrefix: "data-pa-", "elements": ["questions-greeting"]});
pa("require", "cleanUrlTracker", {stripQuery: true, trailingSlash: "remove"});
