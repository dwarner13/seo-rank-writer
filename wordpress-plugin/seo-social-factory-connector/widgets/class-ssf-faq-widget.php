<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class SSF_FAQ_Widget extends \Elementor\Widget_Base {

	public function get_name() {
		return 'ssf_faq';
	}

	public function get_title() {
		return 'SSF FAQ Block';
	}

	public function get_icon() {
		return 'eicon-help-o';
	}

	public function get_categories() {
		return array( 'seo-social-factory' );
	}

	public function get_keywords() {
		return array( 'faq', 'questions', 'accordion', 'ssf' );
	}

	protected function register_controls() {

		$this->start_controls_section( 'section_content', array(
			'label' => 'FAQ Items',
			'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
		) );

		$this->add_control( 'heading', array(
			'label'       => 'Section Heading',
			'type'        => \Elementor\Controls_Manager::TEXT,
			'default'     => 'Frequently Asked Questions',
			'label_block' => true,
		) );

		$repeater = new \Elementor\Repeater();

		$repeater->add_control( 'question', array(
			'label'       => 'Question',
			'type'        => \Elementor\Controls_Manager::TEXT,
			'default'     => 'What services do you offer?',
			'label_block' => true,
		) );

		$repeater->add_control( 'answer', array(
			'label'   => 'Answer',
			'type'    => \Elementor\Controls_Manager::TEXTAREA,
			'default' => 'We offer a full range of professional services tailored to your needs.',
			'rows'    => 4,
		) );

		$this->add_control( 'faq_items', array(
			'label'       => 'FAQ Items',
			'type'        => \Elementor\Controls_Manager::REPEATER,
			'fields'      => $repeater->get_controls(),
			'default'     => array(
				array(
					'question' => 'What services do you offer?',
					'answer'   => 'We offer a full range of professional services tailored to your needs.',
				),
				array(
					'question' => 'How much does it cost?',
					'answer'   => 'We provide free quotes with transparent pricing. No hidden fees, no surprises.',
				),
				array(
					'question' => 'What areas do you serve?',
					'answer'   => 'We serve the greater metro area and surrounding communities.',
				),
			),
			'title_field' => '{{{ question }}}',
		) );

		$this->end_controls_section();

		// ── Style ──
		$this->start_controls_section( 'section_style', array(
			'label' => 'Style',
			'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
		) );

		$this->add_control( 'open_first', array(
			'label'        => 'Open First Item',
			'type'         => \Elementor\Controls_Manager::SWITCHER,
			'default'      => 'yes',
			'label_on'     => 'Yes',
			'label_off'    => 'No',
		) );

		$this->end_controls_section();
	}

	protected function render() {
		$s     = $this->get_settings_for_display();
		$items = $s['faq_items'];
		$open_first = $s['open_first'] === 'yes';
		$widget_id  = $this->get_id();
		?>
		<div class="ssf-faq">
			<?php if ( ! empty( $s['heading'] ) ) : ?>
				<h2 class="ssf-faq__heading"><?php echo esc_html( $s['heading'] ); ?></h2>
			<?php endif; ?>
			<div class="ssf-faq__list">
				<?php foreach ( $items as $i => $item ) :
					$is_open = $open_first && $i === 0;
					$item_id = 'ssf-faq-' . $widget_id . '-' . $i;
				?>
					<div class="ssf-faq__item<?php echo $is_open ? ' ssf-faq__item--open' : ''; ?>">
						<button type="button" class="ssf-faq__question" aria-expanded="<?php echo $is_open ? 'true' : 'false'; ?>" aria-controls="<?php echo $item_id; ?>" onclick="this.parentElement.classList.toggle('ssf-faq__item--open');this.setAttribute('aria-expanded',this.getAttribute('aria-expanded')==='true'?'false':'true')">
							<span><?php echo esc_html( $item['question'] ); ?></span>
							<span class="ssf-faq__icon">
								<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
							</span>
						</button>
						<div class="ssf-faq__answer" id="<?php echo $item_id; ?>">
							<p><?php echo esc_html( $item['answer'] ); ?></p>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
	}
}
