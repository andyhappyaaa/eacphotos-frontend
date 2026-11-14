/**
 * Vercel Serverless Function - 查询赞助记录
 *
 * 从 Creem 拉取该捐赠产品已支付的交易，返回匿名化的赞助列表。
 * 依赖环境变量：CREEM_API_KEY、CREEM_PRODUCT_ID（同 create-donation.js）
 *
 * 注意：Creem 交易字段名（customer.name / amount / created_at 等）以实际 API 返回为准，
 * 若与预期不符，只需调整下面的映射逻辑。
 */

export default async function handler(req, res) {
	const apiKey = String(process.env.CREEM_API_KEY || '').trim();
	const productId = String(process.env.CREEM_PRODUCT_ID || '').trim();

	if (!apiKey || !productId) {
		res.status(500).json({ error: '捐赠尚未配置' });
		return;
	}

	try {
		const url = `https://api.creem.io/v1/transactions/search?product_id=${encodeURIComponent(productId)}&page_size=50`;
		const response = await fetch(url, {
			headers: { 'x-api-key': apiKey }
		});

		const data = await response.json().catch(() => ({}));

		if (!response.ok) {
			res.status(response.status).json({ error: data?.message || data?.error || '查询赞助记录失败' });
			return;
		}

		// 兼容不同返回结构：transactions / items / data / results
		const list = data.transactions || data.items || data.data || data.results || [];

		const donations = (Array.isArray(list) ? list : [])
			.filter((t) => t && t.status === 'paid')
			.map((t) => {
				const name = t.customer?.name || t.customer?.email || '匿名赞助者';
				return {
					id: t.id || t.transaction_id || `${name}-${t.created_at || t.createdAt || ''}`,
					name: mask(name),
					amountLabel: formatAmount(t.amount, t.currency),
					dateLabel: formatDate(t.created_at || t.createdAt)
				};
			});

		res.status(200).json({ donations });
	} catch (err) {
		console.error('[donations] error:', err);
		res.status(500).json({ error: '查询赞助记录失败' });
	}
}

function mask(name) {
	const s = String(name || '').trim();
	if (!s) return '匿名赞助者';
	if (s.includes('@')) {
		const [local, domain] = s.split('@');
		const head = local.slice(0, Math.min(2, local.length));
		return `${head}***@${domain}`;
	}
	if (s.length <= 1) return `${s}**`;
	return `${s.slice(0, 1)}**${s.slice(-1)}`;
}

/** Creem 金额单位为分（minor unit），换算成主币种并加符号 */
function formatAmount(amount, currency) {
	const n = Number(amount);
	if (!Number.isFinite(n)) return null;
	const major = n / 100;
	const symbol = currency === 'USD' ? '$' : `${currency || ''} `;
	return `${symbol}${major.toFixed(2)}`;
}

function formatDate(value) {
	if (!value) return null;
	const d = new Date(value);
	if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
	return String(value).slice(0, 10);
}
