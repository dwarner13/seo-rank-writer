<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class SSF_Trust_Widget extends \Elementor\Widget_Base {

	public function get_name() {
		return 'ssf_trust';
	}

	public function get_title() {
		return 'SSF Trust Bullets';
	}

	public function get_icon() {
		return 'eicon-bullet-list';
	}

	public function get_categories() {
		return array( 'seo-social-factory' );
	}

	public function get_keywords() {
		return array( 'trust', 'bullets', 'features', 'checklist', 'ssf' );
	}

	protected function register_controls() {

		$this->start_controls_section( 'section_content', array(
			'label' => 'Content',
			'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
		) );

		$this->add_control( 'heading', array(
			'label'       => 'Section Heading',
			'type'        => \Elementor\Controls_Manager::TEXT,
			'default'     => 'Why Choose Us',
			'label_block' => true,
		) );

		$repeater = new \Elementor\Repeater();

		$repeater->add_control( 'text', array(
			'label'       => 'Bullet Text',
			'type'        => \Elementor\Controls_Manager::TEXT,
			'default'     => 'Fast and reliable service',
			'label_block' => true,
		) );

		$this->add_control( 'bullets', array(
			'label'       => 'Trust Bullets',
			'type'        => \Elementor\Controls_Manager::REPEATER,
			'fields'      => $repeater->get_controls(),
			'default'     => array(
				array( 'text' => 'Licensed and insured professionals' ),
				array( 'text' => 'Free quotes with no obligation' ),
				array( 'text' => 'Same-day service available' ),
				array( 'text' => '5-star rated on Google' ),
				array( 'text' => 'Locally owned and operated' ),
				array( 'text' => '100% satisfaction guaranteed' ),
			),
			'title_field' => '{{{ text }}}',
		) );

		$this->end_controls_section();

		// ── Style ──
		$this->start_controls_section( 'section_style', array(
			'label' => 'Style',
			'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
		) );

		$this->add_control( 'icon_style', array(
			'label'   => 'Icon Style',
			'type'    => \Elementor\Controls_Manager::SELECT,
			'default' => 'check-circle',
			'options' => array(
				'check-circle' => 'Checkmark Circle',
				'check'        => 'Checkmark',
				'star'         => 'Star',
				'shield'       => 'Shield',
			),
		) );

		$this->add_control( 'icon_color', array(
			'label'   => 'Icon Color',
			'type'    => \Elementor\Controls_Manager::COLOR,
			'default' => '#22c55e',
		) );

		$this->add_control( 'columns', array(
			'label'   => 'Columns',
			'type'    => \Elementor\Controls_Manager::SELECT,
			'default' => '2',
			'options' => array(
				'1' => '1 Column',
				'2' => '2 Columns',
				'3' => '3 Columns',
			),
		) );

		$this->end_controls_section();
	}

	protected function render() {
		$s       = $this->get_settings_for_display();
		$bullets = $s['bullets'];
		$cols    = $s['columns'];
		$color   = esc_attr( $s['icon_color'] );

		$icons = array(
			'check-circle' => '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M7 11l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			'check'        => '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 11l4 4 8-9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			'star'         => '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L11 17l-5.8 3 1.1-6.5L1.6 8.8l6.5-.9z" fill="currentColor"/></svg>',
			'shield'       => '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2L3 6v5c0 4.5 3.4 8.7 8 9.9 4.6-1.2 8-5.4 8-9.9V6l-8-4z" stroke="currentColor" stroke-width="1.5"/><path d="M7.5 11l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		);
		$icon_svg = $icons[ $s['icon_style'] ] ?? $icons['check-circle'];
		?>
		<div class="ssf-trust">
			<?php if ( ! empty( $s['heading'] ) ) : ?>
				<h2 class="ssf-trust__heading"><?php echo esc_html( $s['heading'] ); ?></h2>
			<?php endif; ?>
			<ul class="ssf-trust__list ssf-trust__list--cols-<?php echo esc_attr( $cols ); ?>">
				<?php foreach ( $bullets as $item ) : ?>
					<li class="ssf-trust__item" style="color:<?php echo $color; ?>">
						<span class="ssf-trust__icon"><?php echo $icon_svg; ?></span>
						<span class="ssf-trust__text"><?php echo esc_html( $item['text'] ); ?></span>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>
		<?php
	}
}
