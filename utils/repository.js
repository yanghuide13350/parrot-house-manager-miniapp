"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repository = void 0;
const cloud_1 = require("./cloud");
const types_1 = require("./types");
const CACHE_VERSION = 5;
let session = null;
let sessionLoading = null;
const emptyDashboard = () => ({ stats: { total: 0, forSale: 0, sold: 0, returned: 0, breeder: 0, paired: 0, incubating: 0, revenueCents: 0, salesTotal: 0, returnRate: 0 }, species: [], trend: [] });
const cacheKey = () => session ? `parrot-pro-v${CACHE_VERSION}:${session.openId}` : '';
const dateValue = (value) => value instanceof Date ? value.toISOString() : value ? String(value) : '';
function loadSession() {
    if (!sessionLoading)
        sessionLoading = (0, cloud_1.getSession)().then(value => {
            session = value;
            return value;
        }).finally(() => { sessionLoading = null; });
    return sessionLoading;
}
function mapMedia(items) {
    return (items || []).filter(item => ((item === null || item === void 0 ? void 0 : item.type) === 'image' || (item === null || item === void 0 ? void 0 : item.type) === 'video') && (item === null || item === void 0 ? void 0 : item.fileID)).map(item => ({ assetId: item.assetId, type: item.type, fileID: item.fileID, url: item.fileID, thumbnailFileID: item.thumbnailFileID || '', thumbnailUrl: item.thumbnailFileID || '', posterFileID: item.posterFileID || '', poster: item.posterFileID || '' }));
}
function coverMedia(media) {
    const image = media.find(item => item.type === 'image' && item.url);
    if (image)
        return { url: image.thumbnailUrl || image.url, type: 'image' };
    return { url: types_1.PLACEHOLDER_IMAGE, type: 'placeholder' };
}
function mapParrot(item) {
    const media = mapMedia(item.media);
    const cover = coverMedia(media);
    return {
        id: item.id,
        breed: item.breed || '',
        species: item.species,
        ringNumber: item.ringNumber,
        gender: item.gender,
        status: item.status,
        recordSource: item.recordSource || 'PROFILE',
        purchaseDate: item.purchaseDate || '',
        introductionStage: item.introductionStage || '',
        price: Number(item.priceCents || 0) / 100,
        priceCents: Number(item.priceCents || 0),
        age: item.ageLabel || '未知',
        birthDate: item.birthDate,
        image: cover.url,
        media,
        coverType: cover.type,
        publicIntro: item.publicIntro || '',
        privateNotes: item.privateNotes || '',
        feedingPlanId: item.feedingPlanId || '',
        father: item.father || null,
        mother: item.mother || null,
        birthHatchingRecordId: item.birthHatchingRecordId || '',
        desc: item.privateNotes || '',
        activePairId: item.activePairId || undefined,
        pairedAt: dateValue(item.pairedAt) || undefined,
        revision: item.revision,
        createdAt: dateValue(item.createdAt),
        updatedAt: dateValue(item.updatedAt)
    };
}
function mapPair(item) {
    return {
        id: item.id,
        maleId: item.maleId || item.male_id,
        femaleId: item.femaleId || item.female_id,
        status: item.status,
        pairedAt: dateValue(item.pairedAt || item.paired_at),
        revision: Number(item.revision || 0),
        male: mapParrot(item.male),
        female: mapParrot(item.female)
    };
}
function mapHatching(item) {
    return { id: item.id, pairId: item.pairId, maleId: item.maleId, femaleId: item.femaleId, maleRingNumber: item.maleSnapshot.ringNumber, femaleRingNumber: item.femaleSnapshot.ringNumber, maleSpecies: item.maleSnapshot.species || '', femaleSpecies: item.femaleSnapshot.species || '', pairingDate: dateValue(item.pairingDate), species: item.species, startDate: item.startDate, eggs: item.eggs, hatched: item.hatched, offspringGroups: item.offspringGroups || [], offspring: (item.offspring || []).map((chick) => ({ id: chick.id, ringNumber: chick.ringNumber || '' })), offspringRegistered: Number(item.offspringRegistered || 0), status: item.status, revision: item.revision, completedAt: dateValue(item.completedAt), createdAt: dateValue(item.createdAt), updatedAt: dateValue(item.updatedAt) };
}
function mapSale(item) {
    const media = mapMedia(item.parrotSnapshot && item.parrotSnapshot.media);
    const cover = coverMedia(media);
    return { id: item.id, parrotId: item.parrotId, breed: item.parrotSnapshot.breed || '', species: item.parrotSnapshot.species, ringNumber: item.parrotSnapshot.ringNumber, gender: item.parrotSnapshot.gender, buyer: item.buyer, buyerContact: item.buyerContact, date: item.saleDate, price: Number(item.priceCents || 0) / 100, priceCents: Number(item.priceCents || 0), status: item.status, returnReason: item.returnReason, visitStatus: item.followUpStatus, image: cover.url, revision: item.revision, createdAt: dateValue(item.createdAt) };
}
async function ensureSession() {
    if (!session)
        await loadSession();
    if (!session.authorized)
        throw new Error(session.configured ? '当前微信账号无管理权限' : '主账号尚未配置');
    return session;
}
function applyPairViews(parrots, pairs) {
    const map = new Map(parrots.map(item => [item.id, item]));
    for (const pair of pairs) {
        const male = map.get(pair.maleId);
        const female = map.get(pair.femaleId);
        if (!male || !female)
            continue;
        const pairedAt = new Date(pair.pairedAt).getTime();
        const pairDays = Number.isFinite(pairedAt) ? Math.max(0, Math.floor((Date.now() - pairedAt) / 86400000)) : 0;
        Object.assign(male, { mate: `${female.species} (${female.ringNumber})`, mateId: female.id, activePairId: pair.id, pairedAt: pair.pairedAt, pairDays });
        Object.assign(female, { mate: `${male.species} (${male.ringNumber})`, mateId: male.id, activePairId: pair.id, pairedAt: pair.pairedAt, pairDays });
    }
}
exports.repository = {
    session() { return loadSession(); },
    currentSession() { return session; },
    refreshSession() { return loadSession(); },
    loadCache() {
        if (!session || !session.authorized)
            return null;
        const cached = wx.getStorageSync(cacheKey());
        return cached && cached.version === CACHE_VERSION && cached.ownerOpenId === session.openId ? cached.snapshot : null;
    },
    async bootstrap() {
        await ensureSession();
        const data = await (0, cloud_1.callManagement)('sync.snapshot');
        const parrots = ((data.parrots && data.parrots.items) || []).map(mapParrot);
        const pairs = (data.pairs || []).map(mapPair);
        applyPairViews(parrots, pairs);
        const snapshot = { parrots, pairs, hatchingRecords: ((data.hatching && data.hatching.items) || []).map(mapHatching), salesRecords: ((data.sales && data.sales.items) || []).map(mapSale), dashboard: data.dashboard || emptyDashboard(), syncedAt: new Date().toISOString() };
        wx.setStorageSync(cacheKey(), { version: CACHE_VERSION, ownerOpenId: session.openId, snapshot });
        return snapshot;
    },
    accessList() { return (0, cloud_1.callManagement)('access.list'); },
    feedingPlans() { return (0, cloud_1.callManagement)('feedingPlans.list'); },
    createFeedingPlan(input) { return (0, cloud_1.callManagement)('feedingPlans.create', input, (0, cloud_1.createRequestId)('feeding-plan-create')); },
    updateFeedingPlan(plan, input) { return (0, cloud_1.callManagement)('feedingPlans.update', { ...input, id: plan.id, revision: plan.revision }, (0, cloud_1.createRequestId)('feeding-plan-update')); },
    deleteFeedingPlan(plan) { return (0, cloud_1.callManagement)('feedingPlans.delete', { id: plan.id, revision: plan.revision }, (0, cloud_1.createRequestId)('feeding-plan-delete')); },
    setFeedingPlanEnabled(plan, enabled) { return (0, cloud_1.callManagement)('feedingPlans.setEnabled', { id: plan.id, revision: plan.revision, enabled }, (0, cloud_1.createRequestId)('feeding-plan-enabled')); },
    supplies() { return (0, cloud_1.callManagement)('supplies.list'); },
    createSupply(input) { return (0, cloud_1.callManagement)('supplies.create', { ...input, amountCents: Math.round(Number(input.amount || 0) * 100) }, (0, cloud_1.createRequestId)('supply-create')); },
    setParrotFeedingPlan(id, revision, feedingPlanId) { return (0, cloud_1.callManagement)('parrots.setFeedingPlan', { id, revision, feedingPlanId }, (0, cloud_1.createRequestId)('parrot-feeding-plan')); },
    requestAccess(note) { return (0, cloud_1.callManagement)('access.request', { note }, (0, cloud_1.createRequestId)('access-request')); },
    myAccessStatus() { return (0, cloud_1.callManagement)('access.myStatus'); },
    approveAccess(requestId, note) { return (0, cloud_1.callManagement)('access.approve', { requestId, note }, (0, cloud_1.createRequestId)('access-approve')); },
    rejectAccess(requestId, reviewNote) { return (0, cloud_1.callManagement)('access.reject', { requestId, reviewNote }, (0, cloud_1.createRequestId)('access-reject')); },
    revokeMember(openId) { return (0, cloud_1.callManagement)('access.revokeMember', { openId }, (0, cloud_1.createRequestId)('access-revoke')); },
    setAdmin(openId) { return (0, cloud_1.callManagement)('access.setAdmin', { openId }, (0, cloud_1.createRequestId)('access-set-admin')); },
    unsetAdmin(openId) { return (0, cloud_1.callManagement)('access.unsetAdmin', { openId }, (0, cloud_1.createRequestId)('access-unset-admin')); },
    setAccessPolicy(openAccess) { return (0, cloud_1.callManagement)('access.setPolicy', { openAccess }, (0, cloud_1.createRequestId)('access-policy')); },
    createParrot(input) { return (0, cloud_1.callManagement)('parrots.create', { breed: input.breed, species: input.species, ringNumber: input.ringNumber, gender: input.gender, birthDate: input.birthDate, priceCents: Math.round(Number(input.price || 0) * 100), publicIntro: input.publicIntro || '', privateNotes: input.privateNotes || input.desc || '', father: input.father, mother: input.mother, media: toApiMedia(input.media) }, (0, cloud_1.createRequestId)('parrot-create')); },
    createIntroduction(input) { return (0, cloud_1.callManagement)('introductions.create', { breed: input.breed, species: input.species, ringNumber: input.ringNumber, gender: input.gender, birthDate: input.birthDate, purchaseDate: input.purchaseDate, priceCents: Math.round(Number(input.price || 0) * 100), publicIntro: input.publicIntro || '', privateNotes: input.privateNotes || input.desc || '', father: input.father, mother: input.mother, media: toApiMedia(input.media) }, (0, cloud_1.createRequestId)('introduction-create')); },
    markIntroductionForSale(id, currentRevision) { return (0, cloud_1.callManagement)('introductions.markForSale', { id, revision: currentRevision }, (0, cloud_1.createRequestId)('introduction-for-sale')); },
    updateParrot(id, currentRevision, updates) { return (0, cloud_1.callManagement)('parrots.update', { id, revision: currentRevision, updates: cleanParrotUpdates(updates) }, (0, cloud_1.createRequestId)('parrot-update')); },
    deleteParrot(id, currentRevision) { return (0, cloud_1.callManagement)('parrots.delete', { id, revision: currentRevision }, (0, cloud_1.createRequestId)('parrot-delete')); },
    setBreeder(id, currentRevision) { return (0, cloud_1.callManagement)('parrots.setBreeder', { id, revision: currentRevision }, (0, cloud_1.createRequestId)('breeder-set')); },
    unsetBreeder(id, currentRevision) { return (0, cloud_1.callManagement)('parrots.unsetBreeder', { id, revision: currentRevision }, (0, cloud_1.createRequestId)('breeder-unset')); },
    pairParrots(male, female) { return (0, cloud_1.callManagement)('breeding.pair', { maleId: male.id, femaleId: female.id, maleRevision: male.revision, femaleRevision: female.revision }, (0, cloud_1.createRequestId)('pair-create')); },
    cancelPair(pair) { return (0, cloud_1.callManagement)('breeding.cancel', { pairId: pair.id, revision: pair.revision }, (0, cloud_1.createRequestId)('pair-cancel')); },
    createHatching(input, male, female, pair) { return (0, cloud_1.callManagement)('hatching.create', { maleId: male.id, femaleId: female.id, maleRevision: male.revision, femaleRevision: female.revision, pairRevision: pair && pair.revision, species: input.species, startDate: input.startDate, eggs: input.eggs }, (0, cloud_1.createRequestId)('hatching-create')); },
    updateHatching(record, hatched, offspringGroups) { return (0, cloud_1.callManagement)('hatching.updateProgress', { id: record.id, revision: record.revision, hatched, offspringGroups }, (0, cloud_1.createRequestId)('hatching-progress')); },
    completeHatching(record) { return (0, cloud_1.callManagement)('hatching.complete', { id: record.id, revision: record.revision }, (0, cloud_1.createRequestId)('hatching-complete')); },
    deleteHatching(record) { return (0, cloud_1.callManagement)('hatching.delete', { id: record.id, revision: record.revision }, (0, cloud_1.createRequestId)('hatching-delete')); },
    createFromClutch(record, chicks) { return (0, cloud_1.callManagement)('parrots.createFromClutch', { hatchingRecordId: record.id, revision: record.revision, chicks: chicks.map(item => ({ breed: item.breed, species: item.species, ringNumber: item.ringNumber || '', gender: item.gender, priceCents: Math.round(Number(item.price || 0) * 100), privateNotes: item.privateNotes || '' })) }, (0, cloud_1.createRequestId)('clutch-intake')); },
    createSale(input, parrot) { return (0, cloud_1.callManagement)('sales.create', { parrotId: parrot.id, parrotRevision: parrot.revision, buyer: input.buyer, buyerContact: input.buyerContact || '', saleDate: input.date, priceCents: Math.round(Number(input.price || 0) * 100) }, (0, cloud_1.createRequestId)('sale-create')); },
    returnSale(record, reason) { return (0, cloud_1.callManagement)('sales.return', { id: record.id, revision: record.revision, reason }, (0, cloud_1.createRequestId)('sale-return')); },
    updateFollowUp(record, status) { return (0, cloud_1.callManagement)('sales.updateFollowUp', { id: record.id, revision: record.revision, status }, (0, cloud_1.createRequestId)('sale-followup')); },
    createShareToken(parrotId) { return (0, cloud_1.callManagement)('shares.create', { parrotId }, (0, cloud_1.createRequestId)('share-create')); },
    revokeShareToken(token) { return (0, cloud_1.callManagement)('shares.revoke', { token }, (0, cloud_1.createRequestId)('share-revoke')); },
    saleCopy(parrotId) { return (0, cloud_1.callManagement)('ai.saleCopy.get', { id: parrotId }); },
    openSaleCopy(parrotId) { return (0, cloud_1.callManagement)('ai.saleCopy.open', { id: parrotId }); },
    enqueueSaleCopy(parrotId, input) { return (0, cloud_1.callManagement)('ai.saleCopy.enqueue', { id: parrotId, ...input }); }
};
function toApiMedia(media = []) { return media.filter(item => item.assetId && (item.fileID || item.url)).map(item => ({ assetId: item.assetId, type: item.type, fileID: item.fileID || item.url, posterFileID: item.posterFileID || item.poster || '' })); }
function cleanParrotUpdates(updates) {
    const allowed = {};
    for (const key of ['breed', 'species', 'ringNumber', 'gender', 'birthDate', 'purchaseDate', 'publicIntro', 'privateNotes', 'father', 'mother'])
        if (Object.prototype.hasOwnProperty.call(updates, key))
            allowed[key] = updates[key];
    if (Object.prototype.hasOwnProperty.call(updates, 'price'))
        allowed.priceCents = Math.round(Number(updates.price || 0) * 100);
    if (Object.prototype.hasOwnProperty.call(updates, 'media'))
        allowed.media = toApiMedia(updates.media);
    if (Object.prototype.hasOwnProperty.call(updates, 'desc') && !Object.prototype.hasOwnProperty.call(updates, 'privateNotes'))
        allowed.privateNotes = updates.desc || '';
    return allowed;
}
